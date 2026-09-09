"""安装器行为测试：仅使用临时源与目标，不修改真实全局 skills。"""
from pathlib import Path
import os
import subprocess
import tempfile
import unittest

INSTALLER = Path(__file__).resolve().parents[1] / 'install.sh'

class InstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='aidev-installer-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'source with spaces'
        self.target = self.root / 'platform with spaces' / 'skills'
        self.skill = self.source / 'skills' / 'demo-skill'
        self.skill.mkdir(parents=True)
        (self.skill / 'SKILL.md').write_text('---\nname: demo-skill\ndescription: test\n---\nNew method\n')
        (self.skill / 'references').mkdir()
        (self.skill / 'references' / 'rule.md').write_text('new rule')

    def run_install(self, *args, env=None, ok=True):
        result = subprocess.run(['bash', str(INSTALLER), '--source', str(self.source), '--target', str(self.target), *args], capture_output=True, text=True, errors="replace", env=env)
        if ok:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def backups(self):
        return list((self.target.parent / '.ai-academic-vibecoding-backups').glob('*/demo-skill'))

    def custom_install(self):
        self.run_install()
        (self.target / 'demo-skill' / 'SKILL.md').write_text('my custom method')
        (self.target / 'demo-skill' / 'custom.txt').write_text('keep this')

    def test_fresh_install_copies_support_files_and_preserves_unrelated(self):
        self.target.mkdir(parents=True)
        (self.target / 'unrelated.txt').write_text('untouched')
        self.run_install()
        self.assertEqual((self.target / 'demo-skill/references/rule.md').read_text(), 'new rule')
        self.assertEqual((self.target / 'unrelated.txt').read_text(), 'untouched')

    def test_default_keeps_customized_version(self):
        self.custom_install()
        self.run_install()
        self.assertEqual((self.target / 'demo-skill/SKILL.md').read_text(), 'my custom method')
        self.assertEqual((self.target / 'demo-skill/custom.txt').read_text(), 'keep this')
        self.assertEqual(self.backups(), [])

    def test_explicit_update_preserves_full_unique_backup(self):
        self.custom_install()
        self.run_install('--update', 'demo-skill')
        first = self.backups()
        self.assertEqual(len(first), 1)
        self.assertEqual((first[0] / 'custom.txt').read_text(), 'keep this')
        self.assertEqual((first[0] / 'SKILL.md').read_text(), 'my custom method')
        self.assertEqual((self.target / 'demo-skill/SKILL.md').read_bytes(), (self.skill / 'SKILL.md').read_bytes())
        self.assertFalse((self.target / 'demo-skill/custom.txt').exists())
        self.run_install('--update', 'demo-skill')
        self.assertEqual(len(self.backups()), 1, 'unchanged update should not create a backup')
        (self.skill / 'SKILL.md').write_text('third version')
        self.run_install('--update', 'demo-skill')
        self.assertEqual(len(self.backups()), 2)
        self.assertEqual((first[0] / 'SKILL.md').read_text(), 'my custom method')

    def test_update_only_selected_skill(self):
        second = self.source / 'skills/second-skill'
        second.mkdir()
        (second / 'SKILL.md').write_text('second new')
        self.custom_install()
        (self.target / 'second-skill/SKILL.md').write_text('second custom')
        self.run_install('--update', 'demo-skill')
        self.assertEqual((self.target / 'second-skill/SKILL.md').read_text(), 'second custom')

    def test_multiple_platforms(self):
        other = self.root / 'second platform/skills'
        self.run_install('--target', str(other))
        self.assertTrue((self.target / 'demo-skill/SKILL.md').exists())
        self.assertTrue((other / 'demo-skill/SKILL.md').exists())

    def test_invalid_update_does_not_touch_existing(self):
        self.custom_install()
        self.run_install('--update', 'missing-skill', ok=False)
        self.run_install('--update', '../demo-skill', ok=False)
        self.assertEqual((self.target / 'demo-skill/SKILL.md').read_text(), 'my custom method')

    def test_symlink_target_is_not_replaced(self):
        elsewhere = self.root / 'my-skill'
        elsewhere.mkdir()
        (elsewhere / 'SKILL.md').write_text('linked method')
        self.target.mkdir(parents=True)
        (self.target / 'demo-skill').symlink_to(elsewhere, target_is_directory=True)
        self.run_install()
        self.run_install('--update', 'demo-skill', ok=False)
        self.assertTrue((self.target / 'demo-skill').is_symlink())
        self.assertEqual((elsewhere / 'SKILL.md').read_text(), 'linked method')

    def test_failed_final_move_restores_old_version(self):
        self.custom_install()
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        wrapper = bin_dir / 'mv'
        wrapper.write_text('#!/bin/bash\ncase "$2" in */.aidev-stage.*/new) exit 9;; esac\nexec /bin/mv "$@"\n')
        wrapper.chmod(0o755)
        env = dict(os.environ, PATH=str(bin_dir) + os.pathsep + os.environ['PATH'])
        self.run_install('--update', 'demo-skill', env=env, ok=False)
        self.assertEqual((self.target / 'demo-skill/SKILL.md').read_text(), 'my custom method')
        self.assertEqual((self.target / 'demo-skill/custom.txt').read_text(), 'keep this')
        self.assertFalse(list(self.target.parent.glob('.aidev-stage.*')))

if __name__ == '__main__':
    unittest.main(verbosity=2)
