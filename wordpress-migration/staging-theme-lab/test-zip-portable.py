import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

SCRIPT = Path(__file__).with_name('zip-portable.py')

class PackageTests(unittest.TestCase):
    def test_unicode_filename_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'fixture'
            root.mkdir()
            (root / 'изображение.webp').write_bytes(b'synthetic')
            output = Path(tmp) / 'review.zip'
            subprocess.run([sys.executable, SCRIPT, tmp, 'fixture', output], check=True)
            with ZipFile(output) as archive:
                info = archive.getinfo('fixture/изображение.webp')
                self.assertTrue(info.flag_bits & 0x800)
                self.assertEqual(archive.read(info), b'synthetic')
                archive.extractall(Path(tmp) / 'extract')
            self.assertEqual((Path(tmp) / 'extract/fixture/изображение.webp').read_bytes(), b'synthetic')

    def test_existing_output_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / 'fixture').mkdir()
            output = Path(tmp) / 'review.zip'
            output.write_bytes(b'unchanged')
            result = subprocess.run([sys.executable, SCRIPT, tmp, 'fixture', output], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(output.read_bytes(), b'unchanged')

    def test_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / 'fixture'
            root.mkdir()
            (root / 'linked').symlink_to(Path(tmp) / 'elsewhere')
            result = subprocess.run([sys.executable, SCRIPT, tmp, 'fixture', Path(tmp) / 'review.zip'], capture_output=True)
            self.assertNotEqual(result.returncode, 0)

if __name__ == '__main__':
    unittest.main()
