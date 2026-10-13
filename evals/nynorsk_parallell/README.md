# Nynorsk parallell

Referansebasert eval av oversettelse fra bokmål til nynorsk, laget for #18
(Vurdering av norsk språkmodell).

Evalet svarer på ett avgrenset spørsmål: Hvor nær kommer en modell en
menneskekontrollert nynorsk oversettelse av samme bokmålssetning? Det måler ikke
språkvask, terminologi eller svarkvalitet i Kunnskapsassistenten.

Modulen står for seg selv. Den bruker ikke `Config` eller `RAGQuerier` fra
`eval_from_golden_questions`, og trenger verken RAG-API, Langfuse eller gateway.
Den kjører mot en lokal Ollama-modell eller mot en egen API-nøkkel.

## Kjøring

```bash
cd evals/nynorsk_parallell
uv sync --extra dev
uv run python -m src.main models.toml
```

Modellene står i `models.toml`. Providerne er de samme som i
`eval_from_golden_questions/EVAL_PROVIDERS.md`: `ollama`, `openai` og
`azure_openai`. `openai` virker også mot andre OpenAI-kompatible API-er når
`base_url` og `api_key_env` er satt. En modell som avviser temperatur og seed,
merkes med `omit_sampling_params = true`. Egne forespørselsfelt legges i
`extra_body`.

Nyttige argumenter:

- `--output-dir`: hvor kjøringen lagres (standard `output/`, som ikke sjekkes inn)
- `--env-file`: `.env`-fil med API-nøkler
- `--deadline-minutes`: ingen nye kall sendes etter så mange minutter

Hver kjøring lager en mappe `output/<tidspunkt>/` med:

- `blinded/<hash>.jsonl`: oversettelsene, én fil per modell og gjentak
- `blinded_scores.json`: chrF per hash
- `blind_key.json`: koblingen mellom hash og modell, skrevet etter skåringen
- `results.json`: resultat per modell

Stopper en kjøring etter at blindnøkkelen er skrevet, kan resultatfila bygges
på nytt fra de lagrede oversettelsene. Skårene og nøkkelen leses, de skrives
ikke over:

```bash
uv run python -m src.rebuild output/<tidspunkt> models.toml
```

Tester og lint:

```bash
uv run pytest
ruff check . && ruff format --check .
```

## Fasit

`data/fasit.tsv` har 200 setningspar med kolonnene `id`, `nb` og `nn`.

- **Kilde:** Språkbanken, «Omsetjingsminne frå Nynorsk pressekontor 2021»
  (sbr-47, hdl:21.11146/47), delen for 2020 og 2021
  (`2020_2021_tm_npk_ntb.zip`). Den inneholder nyhetstekst fra NTB på bokmål
  og Nynorsk pressekontor sin oversettelse til nynorsk.
  https://www.nb.no/sprakbanken/ressurskatalog/oai-nb-no-sbr-47/
- **Lisens:** CC0 1.0.
- **Filter:** 8 til 40 ord på bokmålssiden, bokmål ulik nynorsk, én rad per
  bokmålssetning, ingen tomme sider. Nullbreddemellomrom er fjernet.
- **Uttrekk:** 200 par trukket med seed `20261013` fra de 157 268 parene som sto
  igjen etter filteret.
- **Lås:** sha256 av fila står i `data/fasit.sha256` og sjekkes ved hver
  innlasting. Fasiten ble låst før noen modell ble kjørt.

Fasiten kan bygges på nytt fra kildefila med
`uv run python -m src.build_fasit <tsv-fil> -o <ny fil>`.

## Metode

1. **Fast instruksjon.** Alle modeller får samme tekst i én brukermelding:
   «Oversett denne teksten fra bokmål til nynorsk. Svar bare med oversettelsen,
   uten forklaringer.» fulgt av bokmålssetningen. Svaret skåres som det er.
   En modell som legger til forklaringer, taper på det.
2. **Gjentak.** Hver modell oversetter hele fasiten tre ganger, med temperatur
   0,3 og seed 1, 2 og 3. Svaret er avgrenset til 128 tokens.
3. **Blinding.** Oversettelsene lagres under en hash med hemmelig salt.
   Skåringen ser bare hashene. Koblingen til modellnavn skrives etter at
   skåringen er ferdig.
4. **Metrikk.** chrF fra sacrebleu, per setning og samlet for de 200 setningene.
   Tabellen viser snitt og standardavvik for den samlede skåren over gjentakene.
5. **Nullpunkt.** Bokmål og nynorsk deler mye av skrivemåten, så evalet skårer
   også bokmålssetningen uendret. En modell må ligge over dette tallet for å ha
   oversatt noe.

## Kjente begrensninger

1. **Fasiten kan favorisere én stil.** Nynorsk pressekontor oversetter først
   automatisk med Nynorskroboten og retter deretter for hånd. Fasiten kan derfor
   ligge nærmere robotens ordvalg enn en fri oversettelse ville gjort. Nynorsk
   har mange valgfrie former, og chrF straffer en korrekt form som ikke er den
   fasiten bruker.
2. **Nyhetstekst, ikke forvaltningsspråk.** Setningene er NTB-meldinger.
   Resultatet sier lite om stortingsmeldinger, tildelingsbrev og årsrapporter,
   som er det Kunnskapsassistenten arbeider med.
3. **Kontamineringsrisiko.** De fulle Borealis-modellene er trent med oppgaver
   laget av pressemateriale under avtalen mellom staten og rettighetshaverne,
   og kan ha sett NTB- eller NPK-tekst. Modellene med `-open` i navnet er
   trent uten dette materialet og er den rene sammenligningen. Grunnmodellene
   kan uansett ha sett de samme nyhetene på nettet, og det gjelder alle
   modellene i tabellen.

4. **Fasiten er åpent publisert av Nasjonalbiblioteket.** Omsetjingsminnet
   ligger i Språkbanken under CC0, og kan inngå i treningsdataene til alle
   Borealis-variantene, også `-open`. Vi har ikke kunnet bekrefte eller
   avkrefte det, fordi treningsdatasettet ikke er åpent tilgjengelig. Tallene
   for Borealis kan derfor være for høye på akkurat denne fasiten.

I tillegg: 200 setninger og tre gjentak er et lite utvalg. Små forskjeller
mellom modeller bør ikke tolkes.

## Eksempelkjøring 13. oktober 2026

Dette er en eksempelkjøring som viser at evalet virker. Den er ikke et
grunnlag for modellvalg. Tallene er lest fra `resultater/2026-10-13-lokal.json`
og `resultater/2026-10-13-api.json`, som er to kjøringer mot samme fasit
(sha256 i `data/fasit.sha256`). De lokale modellene er GGUF-filer i Q4_K_M,
kjørt i Ollama 0.35.1 på en maskin med 16 GB minne.

| Modell | Modell-ID | chrF (snitt) | Std.avvik | Per gjentak | Tomme svar |
|---|---|---|---|---|---|
| borealis-open-12b | `hf.co/NbAiLab/borealis-open-12b-gguf:Q4_K_M` | 96.31 | 0.00 | 96.31 | 0 |
| borealis-4b | `hf.co/NbAiLab/borealis-4b-gguf:Q4_K_M` | 95.77 | 0.07 | 95.72, 95.85, 95.73 | 0 |
| borealis-open-4b | `hf.co/NbAiLab/borealis-open-4b-gguf:Q4_K_M` | 95.71 | 0.13 | 95.57, 95.73, 95.82 | 0 |
| claude-haiku-5-5 | `claude-haiku-5-5` | 91.28 | 0.49 | 91.19, 90.84, 91.81 | 0 |
| normistral-7b-warm-instruct | `hf.co/ltg/normistral-7b-warm-instruct:Q4_K_M` | 62.61 | 1.09 | 61.49, 63.66, 62.67 | 1 |
| Kopi av bokmål (ingen oversettelse) | | 77.31 | | | 0 |

chrF-signatur: `nrefs:1|case:mixed|eff:yes|nc:6|nw:0|space:no|version:2.6.0`

Slik leses tabellen:

- **Borealis-open 12B har ett gjentak, ikke tre.** Kjøringen ble stoppet etter
  første gjentak fordi modellen brukte for mye minne på maskinen. Tallet har
  derfor ingen spredning og bør ikke sammenlignes direkte med de andre.
- **Borealis 4B og Borealis-open 4B er ikke til å skille.** Forskjellen er
  mindre enn spredningen mellom gjentakene. Pressematerialet i den fulle
  modellen gir altså ikke noe synlig utslag her. Se likevel begrensning 4.
- **NorMistral ligger under nullpunktet fordi den ikke følger instruksjonen.**
  Den oversetter, men legger ofte til forklaringer etter oversettelsen, og
  svaret skåres som det er. Tallet sier derfor mer om instruksjonsfølging
  enn om nynorsken. NorMistral er utviklet av Språkteknologigruppa ved
  Universitetet i Oslo i samarbeid med blant andre Nasjonalbiblioteket.
- **Claude Haiku 5.5 er kjørt med andre innstillinger.** API-et avviser
  temperatur og seed, og modellen er kjørt uten tenking. Den er med som
  ekstern referanse. Vi hadde ikke tilgang til OpenAI-modellene som #18
  nevner.
- **Ikke kjørt:** `mistral:latest` og `nb-llama-3.1-8b`, som står i
  `models.toml`. Tiden rakk ikke.

Modellene og lisensene:

| Modell | Kilde | Lisens |
|---|---|---|
| `NbAiLab/borealis-open-12b-gguf`, `NbAiLab/borealis-open-4b-gguf` | Nasjonalbiblioteket, https://ai.nb.no | Gemma |
| `NbAiLab/borealis-4b-gguf` | Nasjonalbiblioteket, https://ai.nb.no | Nasjonalbibliotekets egen lisens, se modellkortet |
| `ltg/normistral-7b-warm-instruct` | Språkteknologigruppa, UiO | Apache 2.0 |
| `claude-haiku-5-5` | Anthropic, API | Kommersiell tjeneste |
