import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NoteForm } from "./note-form";

describe("NoteForm", () => {
  it("does not call the action when the note is empty", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<NoteForm action={action} />);

    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Напишите текст заметки.");
  });

  it("submits the text the user typed", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<NoteForm action={action} />);

    await user.type(screen.getByLabelText("Новая заметка"), "купить хлеб");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("body")).toBe("купить хлеб");
  });
});
