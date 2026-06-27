// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, act, waitFor, fireEvent } from "@testing-library/react";
import { useModalA11y } from "../use-modal-a11y";

// jsdom does no layout, so `offsetParent` is always null and the hook's
// focusable-element detection would find nothing. Make attached elements report
// a non-null offsetParent (their parent) so the focus-trap logic is exercised.
let originalOffsetParent: PropertyDescriptor | undefined;
beforeAll(() => {
  originalOffsetParent = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetParent",
  );
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });
});
afterAll(() => {
  if (originalOffsetParent) {
    Object.defineProperty(
      HTMLElement.prototype,
      "offsetParent",
      originalOffsetParent,
    );
  }
});

function TestModal({
  open,
  onEscape,
}: {
  open: boolean;
  onEscape?: () => void;
}) {
  const ref = useModalA11y<HTMLDivElement>({ open, onEscape });
  return (
    <div>
      <button data-testid="outside">outside</button>
      {open && (
        <div ref={ref} data-testid="container" tabIndex={-1}>
          <button data-testid="b1">b1</button>
          <button data-testid="b2">b2</button>
          <button data-testid="b3">b3</button>
        </div>
      )}
    </div>
  );
}

describe("useModalA11y", () => {
  it("locks body scroll while open and clears it when closed", () => {
    const { rerender } = render(<TestModal open={false} />);
    expect(document.body.style.position).toBe("");

    rerender(<TestModal open={true} />);
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<TestModal open={false} />);
    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("clears the scroll lock on unmount", () => {
    const { unmount } = render(<TestModal open={true} />);
    expect(document.body.style.position).toBe("fixed");
    unmount();
    expect(document.body.style.position).toBe("");
  });

  it("calls onEscape when Escape is pressed", () => {
    const onEscape = vi.fn();
    render(<TestModal open={true} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the container on open", async () => {
    const { getByTestId } = render(<TestModal open={true} />);
    await waitFor(() => {
      const container = getByTestId("container");
      expect(container.contains(document.activeElement)).toBe(true);
    });
  });

  it("restores focus to the previously focused element on close", async () => {
    const { getByTestId, rerender } = render(<TestModal open={false} />);
    const outside = getByTestId("outside");
    act(() => outside.focus());
    expect(document.activeElement).toBe(outside);

    rerender(<TestModal open={true} />);
    await waitFor(() => {
      expect(getByTestId("container").contains(document.activeElement)).toBe(
        true,
      );
    });

    rerender(<TestModal open={false} />);
    expect(document.activeElement).toBe(outside);
  });

  it("keeps Tab focus within the container", async () => {
    const { getByTestId } = render(<TestModal open={true} />);
    const b1 = getByTestId("b1");
    const b3 = getByTestId("b3");

    // Tab from the last focusable element wraps to the first.
    act(() => b3.focus());
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(b1);

    // Shift+Tab from the first focusable element wraps to the last.
    act(() => b1.focus());
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(b3);
  });
});
