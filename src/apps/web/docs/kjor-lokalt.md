# Kjør Kunnskapsassistenten lokalt

Slik får du appen opp på din egen maskin, mot den delte test-backenden og
Typesense, med ekte svar og ekte filtre. Guiden er for deg som ikke er
utvikler og har Claude Code til hjelp. Hvert steg er én kommando eller én
handling, og under står det hva du skal se når det har gått bra. Kommandoene
skrives i Terminal på Mac.

## 1. Git og Node 24

```sh
git --version
```

Du skal se `git version` og et tall. Spør Mac om å installere
utviklerverktøy, svarer du ja, venter til det er ferdig og kjører kommandoen
igjen.

Node installeres med nvm:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
```

Lukk Terminal og åpne den igjen, så den finner nvm. Så:

```sh
nvm install 24
node --version
```

Den siste skal skrive `v24` og mer, for eksempel `v24.21.0`.

## 2. Koden

```sh
git clone https://github.com/digdir/kunnskapsassistenten.git
cd kunnskapsassistenten/src
npm ci
```

`npm ci` tar et minutt eller to og slutter med `added` og et antall pakker.
Advarsler om `install-scripts` på slutten er ventet. Alle kommandoene videre
kjøres i `src/`.

## 3. Nøklene

```sh
cp apps/web/.env.example apps/web/.env.local
```

Åpne `apps/web/.env.local` i en teksteditor. Alt er fylt inn unntatt to
linjer:

- `KA_API_KEY=`: nøkkelen til backenden på `test.rag.digdir.cloud`. Den gir
  bare lov til å stille spørsmål.
- `TYPESENSE_API_KEY=`: søkenøkkelen til Typesense, som gir filtrene og
  utdragene i kildene.

Be teamet om begge. De deles i passordhåndtereren, aldri i chat eller e-post.
Lim dem inn rett etter `=`, uten mellomrom, og ikke i Claude Code heller.
`.env.local` holdes utenfor git og skal aldri committes.

## 4. Start appen

```sh
npm run web
```

Etter noen sekunder står det `Local:   http://localhost:5173/`. Åpne den
adressen i nettleseren. Står det en linje som begynner med `[ka] Live mangler`,
se steg 5 først.

Still et spørsmål, for eksempel «Hva skriver Statens vegvesen om
trafikksikkerhet i årsrapporten for 2024?». Et ekte svar ser slik ut: først
står «Fremgangsmåte» mens appen leter, så kommer svaret med små tall som [1] og
[2] som viser til kildene, og under svaret «Kilder brukt i svaret» med
dokumenter fra Kudos. Filterpanelet har Dokumenttyper, Virksomheter og År.

Appen stopper med Ctrl+C i Terminal. Er 5173 opptatt, tar den neste ledige
port og skriver den ut. En annen port velger du med `npm run web -- --port 5180`.

## 5. Når det feiler

Etter hver endring i `.env.local`: stopp appen med Ctrl+C og start den igjen
med `npm run web`. Den leser fila bare når den starter.

| Du ser                                                 | Det betyr                                                  | Gjør dette                                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `[ka] Live mangler` og noen navn, i Terminal           | De linjene er tomme i `.env.local`                         | Fyll inn linjene den nevner                                                                                                |
| «Oppsettet mangler» i appen                            | `KA_API_URL` mangler i `.env.local`                        | Kopier `.env.example` på nytt (steg 3), og lim inn nøklene igjen                                                           |
| «Ingen tilgang» når du spør                            | Backenden avviste `KA_API_KEY`                             | Sjekk at nøkkelen er den for `test.rag.digdir.cloud`, og at hele står med, uten mellomrom                                  |
| «Filtrering er ikke tilgjengelig ennå» i filterpanelet | Typesense godtok ikke nøkkelen, eller fant ikke samlingene | Sjekk `TYPESENSE_API_KEY`, og at `TYPESENSE_URL`, `KA_FACET_COLLECTIONS` og `KA_CHUNK_COLLECTIONS` er som i `.env.example` |
| «Svaret kom ikke fram» når du spør                     | Backenden svarte med en feil                               | Si fra til teamet, med klokkeslettet                                                                                       |

## 6. Jobbe med Claude Code

Start Claude Code i `src/`:

```sh
claude
```

Be den først lese `apps/web/CLAUDE.md`. Der står reglene for koden og hvor
ting ligger. Så, én ting om gangen:

1. Be om en egen gren for endringen før noe endres, aldri `main`.
2. Beskriv endringen, og se den i nettleseren mens `npm run web` kjører.
3. Be Claude Code kjøre sjekkene som står i `CLAUDE.md`, og åpne en
   utkast-PR mot `main` med en kort beskrivelse på norsk. Du får lenken til
   PR-en tilbake.
4. Noen i teamet ser over PR-en og merger den.
