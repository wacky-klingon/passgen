"""Headless UI behavior tests; no window or system clipboard is opened."""

from unittest.mock import Mock

import pytest

pytest.importorskip("tkinter")

from passgen import gui
from passgen.cli import main
from passgen.policy import Policy


def window():
    app = gui.PasswordWindow.__new__(gui.PasswordWindow)
    for name, value in {
        "min_length": "24",
        "max_length": "64",
        "words": "6",
        "use_sets": False,
        "mixed_case": True,
        "numbers": False,
        "symbols": True,
    }.items():
        setattr(app, name, Mock(get=Mock(return_value=value)))
    app.sets = {"people": ["Sam"]}
    app.root = Mock()
    app.status = Mock()
    app.show_text = Mock()
    app.word_input = Mock()
    app.mode_note = Mock()
    return app


def test_tap_generates_and_copies(monkeypatch):
    generate = Mock(side_effect=["first", "second"])
    monkeypatch.setattr(gui, "generate", generate)
    app = window()
    for password in ("first", "second"):
        assert app.generate_and_copy() == "break"
        app.show_text.assert_called_with(password)
        app.root.clipboard_append.assert_called_with(password)
    assert app.root.clipboard_clear.call_count == 2
    generate.assert_called_with(
        Policy(24, True, False, True), use_sets=False, sets=app.sets, words=6
    )


def test_configured_disables_and_ignores_word_count(monkeypatch):
    app = window()
    app.use_sets.get.return_value = True
    app.words.get.return_value = "invalid"
    generate = Mock(return_value="new")
    monkeypatch.setattr(gui, "generate", generate)
    app.update_mode()
    app.word_input.configure.assert_called_with(state="disabled")
    app.generate_and_copy()
    assert generate.call_args.kwargs["words"] == 3
    app.use_sets.get.return_value = False
    app.update_mode()
    app.word_input.configure.assert_called_with(state="normal")


def test_invalid_input_does_not_replace_password_or_clipboard():
    app = window()
    app.min_length.get.return_value = "bad"
    app.generate_and_copy()
    app.show_text.assert_not_called()
    app.root.clipboard_clear.assert_not_called()
    assert "integers" in app.status.set.call_args.args[0]


def test_generation_error_does_not_copy(monkeypatch):
    app = window()
    monkeypatch.setattr(gui, "generate", Mock(side_effect=ValueError("invalid sets")))
    app.generate_and_copy()
    app.show_text.assert_not_called()
    app.root.clipboard_clear.assert_not_called()
    app.status.set.assert_called_once_with("invalid sets")


def test_clipboard_error_is_reported(monkeypatch):
    app = window()
    monkeypatch.setattr(gui, "generate", Mock(return_value="new"))
    app.root.clipboard_append.side_effect = gui.tk.TclError()
    app.generate_and_copy()
    assert "clipboard is unavailable" in app.status.set.call_args.args[0]


@pytest.mark.parametrize(
    "args", [[], ["gui"], ["--no-sets", "--no-numbers", "--words", "6"]]
)
def test_default_entrypoint_opens_gui(args, monkeypatch, tmp_path, capsys):
    monkeypatch.chdir(tmp_path)
    launch = Mock(return_value=0)
    monkeypatch.setattr(gui, "launch", launch)
    assert main(args) == 0
    launch.assert_called_once()
    assert capsys.readouterr().out == ""
    if "--no-numbers" in args:
        assert not launch.call_args.args[0].numbers
        assert launch.call_args.kwargs["words"] == 6


def test_display_error(monkeypatch):
    monkeypatch.setattr(gui.tk, "Tk", Mock(side_effect=gui.tk.TclError()))
    with pytest.raises(ValueError, match="Cannot open a window"):
        gui.launch(Policy())
