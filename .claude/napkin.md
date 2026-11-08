# Napkin — mistakes and corrections (stock-picker)

- 2026-11-07: Launched 13 parallel reader agents over ~50M chars of PDFs at once; all hit the 5-hour usage limit before saving anything. Next time: extract relevant passages locally first, read in small batches, and make agents write notes after every chunk.
- 2026-11-07: Google Drive connector can't download files > ~5 MB (message too large). Use the Mac's synced Drive folder + stage files; folders deeper than 7 levels can't be staged.
- 2026-11-07: GitHub Pages on this private repo failed before ("Ensure GitHub Pages has been enabled"). Pages must be turned on in repo Settings, and private repos need GitHub Pro or the repo made public.
- Cloud sandbox and Mac VM can't reach Fundamentus/Yahoo/SEC. Test data fetching through GitHub Actions runs, not locally.
