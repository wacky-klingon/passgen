"""Minimal Tkinter interface; importing this module never opens a window."""

import tkinter as tk
from tkinter import ttk

from passgen.generator import generate
from passgen.policy import Policy


class PasswordWindow:
    def __init__(self, root, policy: Policy, *, sets=None, use_sets=False, words=4):
        self.root = root
        self.sets = sets
        root.title("passgen")
        root.geometry("520x340")
        root.minsize(420, 320)

        self.mixed_case = tk.BooleanVar(root, policy.mixed_case)
        self.numbers = tk.BooleanVar(root, policy.numbers)
        self.symbols = tk.BooleanVar(root, policy.symbols)
        self.use_sets = tk.BooleanVar(root, use_sets)
        self.min_length = tk.StringVar(root, str(policy.min_length))
        self.words = tk.StringVar(root, str(words))
        self.status = tk.StringVar(
            root, "Click the password area to generate and copy."
        )

        frame = ttk.Frame(root, padding=12)
        frame.pack(fill="both", expand=True)
        toggles = ttk.Frame(frame)
        toggles.pack(fill="x")
        for label, variable in (
            ("Mixed case", self.mixed_case),
            ("Numbers", self.numbers),
            ("Symbols", self.symbols),
        ):
            ttk.Checkbutton(toggles, text=label, variable=variable).pack(
                side="left", expand=True
            )

        modes = ttk.Frame(frame)
        modes.pack(fill="x", pady=10)
        for label, value in (("English words", False), ("Configured sets", True)):
            ttk.Radiobutton(
                modes,
                text=label,
                variable=self.use_sets,
                value=value,
                command=self.update_mode,
            ).pack(side="left", expand=True)

        limits = ttk.Frame(frame)
        limits.pack(fill="x")
        ttk.Label(limits, text="Minimum length").pack(side="left")
        ttk.Spinbox(
            limits, from_=1, to=4096, width=6, textvariable=self.min_length
        ).pack(side="left", padx=6)
        ttk.Label(limits, text="Words").pack(side="left", padx=(12, 0))
        self.word_input = ttk.Spinbox(
            limits, from_=4, to=128, width=5, textvariable=self.words
        )
        self.word_input.pack(side="left", padx=6)
        self.mode_note = ttk.Label(frame, wraplength=470)
        self.mode_note.pack(fill="x", pady=6)
        ttk.Separator(frame).pack(fill="x", pady=4)

        self.text_area = tk.Text(
            frame,
            wrap="word",
            height=4,
            cursor="hand2",
            takefocus=True,
            font="TkFixedFont",
            exportselection=False,
        )
        self.text_area.pack(fill="both", expand=True)
        self.show_text("Click here to generate and copy")
        self.text_area.bind("<Button-1>", self.generate_and_copy)
        self.text_area.bind("<Return>", self.generate_and_copy)
        self.text_area.bind("<space>", self.generate_and_copy)
        ttk.Label(frame, textvariable=self.status, wraplength=470).pack(
            fill="x", pady=6
        )
        self.update_mode()

    def update_mode(self):
        configured = self.use_sets.get()
        self.word_input.configure(state="disabled" if configured else "normal")
        self.mode_note.configure(
            text=(
                "Personal words are guessable; prefer dictionary mode for sensitive accounts."
                if configured
                else "Six or more words are recommended for sensitive accounts."
            )
        )

    def show_text(self, text):
        self.text_area.configure(state="normal")
        self.text_area.delete("1.0", "end")
        self.text_area.insert("1.0", text)
        self.text_area.configure(state="disabled")

    def generate_and_copy(self, event=None):
        try:
            try:
                length = int(self.min_length.get())
                words = 4 if self.use_sets.get() else int(self.words.get())
            except ValueError:
                raise ValueError(
                    "Minimum length and word count must be integers."
                ) from None
            policy = Policy(
                length, self.mixed_case.get(), self.numbers.get(), self.symbols.get()
            )
            password = generate(
                policy, use_sets=self.use_sets.get(), sets=self.sets, words=words
            )
        except ValueError as error:
            self.status.set(str(error))
            return "break"

        self.show_text(password)
        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(password)
        except tk.TclError:
            self.status.set(
                "Generated, but clipboard is unavailable. Copy was not completed."
            )
        else:
            self.status.set("New password copied. Clipboard history may retain it.")
        return "break"


def launch(policy: Policy, *, sets=None, use_sets=False, words=4) -> int:
    try:
        root = tk.Tk()
    except tk.TclError:
        raise ValueError(
            "Cannot open a window. Check your display or use 'passgen generate'."
        ) from None
    PasswordWindow(root, policy, sets=sets, use_sets=use_sets, words=words)
    root.mainloop()
    return 0


if __name__ == "__main__":
    from passgen.cli import main

    raise SystemExit(main())
