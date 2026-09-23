"""Regression test for direct IDE/script execution in an installed environment."""

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest


@pytest.mark.skipif(
    importlib.util.find_spec("tkinter") is None, reason="Tk not installed"
)
def test_direct_gui_script(tmp_path):
    script = Path(__file__).resolve().parents[1] / "src/passgen/gui.py"
    result = subprocess.run(
        [sys.executable, str(script), "--help"],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "Opens the GUI by default" in result.stdout
    assert result.stderr == ""
