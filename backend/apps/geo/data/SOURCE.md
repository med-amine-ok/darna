# Geography data: where it comes from

- **Source**: https://github.com/el-amin-dev/algeria-wilayas-communes
  (files `data/wilayas.json` and `data/communes.json`, commit
  `4e26e712179f7379fe34578e7b94cc8154817295`).
- **Licence**: CC0 1.0 Universal (public domain dedication).
- **Downloaded**: 2026-11-11.
- **Counts**: 69 wilayas, 1,541 communes, 591 dairas (the dairas are read
  from the commune rows).

## What was changed

The two files were converted to a compact shape; nothing was added or guessed:

- `wilayas.json`: `code` (1 to 69), `name_fr`, `name_ar`, `name_en`.
- `communes.json`: `wilaya_code`, `name_fr`, `name_ar`, `name_en`,
  `postal_code`, `daira_fr`, `daira_ar`.

## Known limits of the source

- No coordinates: `latitude` and `longitude` stay empty.
- No commune code: a commune is identified by its wilaya and French name
  (unique in the dataset).
- 27 communes have no postal code (stored as an empty string).
- The source does not say which former wilaya each of the 11 new wilayas
  (59 to 69) came from, so `legacy_code_58` is empty for them. Wilayas 1 to 58
  keep their own code.

Load or refresh with `python manage.py seed_geo` (safe to run again).
