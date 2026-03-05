import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all user data (cascades handle cards, review_logs, card_tags)
  // Storage images need manual cleanup
  const { data: cards } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", user.id);

  if (cards && cards.length > 0) {
    // Delete all card images from storage
    const { data: files } = await supabase.storage
      .from("card-images")
      .list(user.id);

    if (files && files.length > 0) {
      // List subdirectories (card folders) and delete all files
      for (const folder of files) {
        const { data: cardFiles } = await supabase.storage
          .from("card-images")
          .list(`${user.id}/${folder.name}`);

        if (cardFiles && cardFiles.length > 0) {
          const paths = cardFiles.map(
            (f) => `${user.id}/${folder.name}/${f.name}`
          );
          await supabase.storage.from("card-images").remove(paths);
        }
      }
    }
  }

  // Delete user from auth (requires service role key)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await serviceClient.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
