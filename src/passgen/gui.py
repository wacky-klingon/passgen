"""Minimal Tkinter interface; importing this module never opens a window."""

import tkinter as tk
from pathlib import Path
from tkinter import filedialog, ttk

from passgen.generator import generate, normalize
from passgen.personal_lists import (
    DEFAULT_FILES,
    default_personal_lists,
    load_personal_file,
)
from passgen.policy import Policy


def list_summary(source: str, entries: list[str], count: int | None = None) -> str:
    count = len(entries) if count is None else count
    preview = ", ".join(entries[:3])
    if len(entries) > 3:
        preview += ", …"
    return f"{source}: {preview} ({count} usable)"


class PasswordWindow:
    def __init__(self, root, policy: Policy, *, sets=None, use_sets=False, words=3):
        self.root = root
        self.sets = default_personal_lists(policy) if sets is None else sets
        root.title("passgen")
        root.geometry("560x500")
        root.minsize(440, 430)

        self.mixed_case = tk.BooleanVar(root, policy.mixed_case)
        self.numbers = tk.BooleanVar(root, policy.numbers)
        self.symbols = tk.BooleanVar(root, policy.symbols)
        self.substitutions = tk.BooleanVar(root, policy.substitutions)
        self.easy_to_type = tk.BooleanVar(root, policy.easy_to_type)
        self.use_sets = tk.BooleanVar(root, use_sets)
        self.min_length = tk.StringVar(root, str(policy.min_length))
        self.max_length = tk.StringVar(root, str(policy.max_length))
        self.words = tk.StringVar(root, str(words))
        self.status = tk.StringVar(
            root, "Click the password area to generate and copy."
        )
        self.list_status = {
            name: tk.StringVar(
                root,
                list_summary(f"default {DEFAULT_FILES[name]}", self.sets.get(name, [])),
            )
            for name in DEFAULT_FILES
        }

        frame = ttk.Frame(root, padding=12)
        frame.pack(fill="both", expand=True)
        toggles = ttk.Frame(frame)
        toggles.pack(fill="x")
        for index, (label, variable) in enumerate(
            (
                ("Mixed case", self.mixed_case),
                ("Numbers", self.numbers),
                ("Symbols", self.symbols),
                ("Substitutions", self.substitutions),
                ("Easy to type", self.easy_to_type),
            )
        ):
            ttk.Checkbutton(toggles, text=label, variable=variable).grid(
                row=index // 3, column=index % 3, sticky="w", padx=6, pady=2
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
            limits, from_=1, to=128, width=5, textvariable=self.min_length
        ).pack(side="left", padx=6)
        ttk.Label(limits, text="Maximum length").pack(side="left", padx=(12, 0))
        ttk.Spinbox(
            limits, from_=1, to=128, width=5, textvariable=self.max_length
        ).pack(side="left", padx=6)
        ttk.Label(limits, text="Words").pack(side="left", padx=(12, 0))
        self.word_input = ttk.Spinbox(
            limits, from_=3, to=128, width=5, textvariable=self.words
        )
        self.word_input.pack(side="left", padx=6)
        self.mode_note = ttk.Label(frame, wraplength=470)
        self.mode_note.pack(fill="x", pady=6)
        list_controls = ttk.Frame(frame)
        list_controls.pack(fill="x", pady=4)
        for row, (name, label) in enumerate(
            (
                ("people", "Names"),
                ("places", "Places"),
                ("things", "Things"),
            )
        ):
            ttk.Button(
                list_controls,
                text=f"Replace {label} TXT",
                command=lambda category=name: self.load_list(category),
            ).grid(row=row, column=0, sticky="ew", padx=(0, 8), pady=2)
            ttk.Label(
                list_controls, textvariable=self.list_status[name], wraplength=330
            ).grid(row=row, column=1, sticky="w", pady=2)
        list_controls.columnconfigure(1, weight=1)
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

    def current_policy(self) -> Policy:
        try:
            min_length = int(self.min_length.get())
            max_length = int(self.max_length.get())
        except ValueError:
            raise ValueError("Minimum and maximum length must be integers.") from None
        return Policy(
            min_length,
            self.mixed_case.get(),
            self.numbers.get(),
            self.symbols.get(),
            max_length,
            self.substitutions.get(),
            self.easy_to_type.get(),
        )

    def load_list(self, name: str):
        filename = filedialog.askopenfilename(filetypes=[("Text files", "*.txt")])
        if not filename:
            return
        try:
            policy = self.current_policy()
            entries = load_personal_file(Path(filename), name, policy)
            count = len({normalize(entry, policy) for entry in entries})
        except ValueError as error:
            self.status.set(str(error))
            return
        self.sets = dict(self.sets) if isinstance(self.sets, dict) else {}
        self.sets[name] = entries
        self.list_status[name].set(list_summary(Path(filename).name, entries, count))
        self.status.set(f"Loaded {count} usable {name} entries locally.")

    def generate_and_copy(self, event=None):
        try:
            try:
                words = 3 if self.use_sets.get() else int(self.words.get())
            except ValueError:
                raise ValueError(
                    "Minimum length, maximum length and word count must be integers."
                ) from None
            policy = self.current_policy()
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


def launch(policy: Policy, *, sets=None, use_sets=False, words=3) -> int:
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
