import {
  Button,
  EXPERIMENTAL_FileUpload as FileUpload,
  Field,
  Heading,
  Label,
  Paragraph,
  Tag,
} from '@digdir/designsystemet-react';
import { CloudUpIcon, TrashIcon } from '@navikt/aksel-icons';
import { useEffect, useId, useRef, useState } from 'react';
import { useUserDocuments } from '../../layout/useUserDocuments';
import { UPLOAD_ACCEPT, type UserDocument, type UserDocumentStatus } from '../../model';
import { fileSize, MAX_UPLOAD_TEXT, uploadErrorText } from './uploadText';

/** «PDF» and «DOCX», as a reader expects to see a file type written. */
const TYPE_LABEL = { pdf: 'PDF', docx: 'DOCX' } as const;

/** The reader's own documents: a place to drop files, and what they dropped. No mode has an
 * upload endpoint yet (src/api/uploadFactory.ts), so the zone is switched off up front. */
export function OwnDocuments() {
  const { documents, unavailable, upload, remove } = useUserDocuments();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const removeRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const focusAfterRemove = useRef<string | undefined>(undefined);
  const announcement = useUploadAnnouncement(documents);

  // A remove button that removes itself drops focus to `<body>` (WCAG 2.4.3). It goes to the
  // next row, else the previous, else the picker. In an effect, because that button exists
  // only once React has drawn the shorter list.
  useEffect(() => {
    const target = focusAfterRemove.current;
    if (target === undefined) return;
    focusAfterRemove.current = undefined;

    const button = target === '' ? undefined : removeRefs.current.get(target);
    if (button) button.focus();
    else inputRef.current?.focus();
  }, [documents]);

  function removeDocument(id: string) {
    const index = documents.findIndex((document) => document.id === id);
    const next = documents[index + 1] ?? documents[index - 1];
    focusAfterRemove.current = next?.id ?? '';
    removeRefs.current.delete(id);
    void remove(id);
  }

  async function choose(files: FileList | null) {
    if (!files) return;

    // One at a time: every upload writes to the same list, and two in flight would race.
    for (const file of Array.from(files)) {
      await upload(file);
    }

    // The same file can be picked again after it was removed, and an input
    // that still holds it fires no change event the second time.
    if (inputRef.current) inputRef.current.value = '';
  }

  // The live region is mounted even when silent: one that appears together with
  // its text is not announced (`ErrorState` does the same).
  const status = (
    <>
      <output className="ds-sr-only">{announcement}</output>

      {documents.length > 0 && (
        <ul className="own-documents__list" id={listId}>
          {documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              removeRef={(button) => {
                if (button) removeRefs.current.set(document.id, button);
                else removeRefs.current.delete(document.id);
              }}
              onRemove={() => removeDocument(document.id)}
            />
          ))}
        </ul>
      )}
    </>
  );

  // No mode has an upload endpoint yet, so this is the zone the reader sees: the same zone as
  // when upload works, switched off, so the reader sees what is coming. The input is `disabled`,
  // which takes it out of the tab order, and filters.css draws the zone off from that.
  const off = unavailable !== undefined;

  return (
    <section className="documents-list own-documents">
      <div className="own-documents__heading">
        {/* Level 4, a sibling of «Fra <korpus>» under «Dokumenter», as the spec draws. */}
        <Heading level={4} data-size="2xs">
          Dine dokumenter
        </Heading>

        {/* «Ny» only where upload works. */}
        <Tag data-color="info" data-size="sm">
          {off ? 'Kommer snart' : 'Ny'}
        </Tag>
      </div>

      {/* «Velg filer» is a span: the real control is the file input CSS lays over the zone,
          and a button would be a second, dead tab stop. `EXPERIMENTAL_` FileUpload is only a
          styled div, so a change costs the box, not the flow. Neutral when off, the colours
          Designsystemet's read-only state would give it. */}
      <Field>
        <Label>Last opp egne dokumenter</Label>

        <FileUpload
          data-size="sm"
          data-color={off ? 'neutral' : undefined}
          className="own-documents__zone"
        >
          <CloudUpIcon aria-hidden="true" fontSize="1.5rem" />

          <Field.Description>
            Slipp filer her, eller velg dem selv. Kun PDF og .docx for øyeblikket, maks{' '}
            {MAX_UPLOAD_TEXT}.
          </Field.Description>

          {/* Off, `aria-disabled` marks «Velg filer» as part of a control that is off. A screen
              reader hears that from the input, but contrast checkers read it here: text in an
              inactive control is exempt from 1.4.3, and without it axe flags the dimmed label.
              Designsystemet dims it from the same attribute. */}
          <Button asChild variant="secondary" data-size="sm" aria-disabled={off || undefined}>
            <span>Velg filer</span>
          </Button>

          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={off}
            accept={UPLOAD_ACCEPT}
            aria-describedby={listId}
            onChange={(event) => void choose(event.currentTarget.files)}
          />
        </FileUpload>
      </Field>

      {status}
    </section>
  );
}

/** What the live region says: a file taken in, there, or refused, never the percentage, which
 * would bury the status (WCAG 4.1.3). From the documents, not the picker, so compose-field
 * uploads are announced too. Silent on first render: restored documents are not news. */
function useUploadAnnouncement(documents: UserDocument[]): string {
  const [seen, setSeen] = useState<Map<string, UserDocumentStatus> | undefined>(undefined);
  const [announcement, setAnnouncement] = useState('');

  // Set during render, not in an effect, which would draw the new row before
  // saying it (React's pattern for state that follows a prop).
  const now = new Map(documents.map((document) => [document.id, document.status]));

  if (seen === undefined) {
    setSeen(now);
  } else {
    const changed = documents.find((document) => seen.get(document.id) !== document.status);

    if (changed) {
      setSeen(now);
      setAnnouncement(announce(changed));
    }
  }

  return announcement;
}

/** What to say about one document that has just changed state. */
function announce(document: UserDocument): string {
  if (document.status === 'uploading') return `Laster opp ${document.name}`;
  if (document.status === 'ready') return `${document.name} er lastet opp`;

  return `${document.name} ble ikke lastet opp. ${uploadErrorText(document.errorCode ?? 'failed')}`;
}

function DocumentRow({
  document,
  onRemove,
  removeRef,
}: {
  document: UserDocument;
  onRemove: () => void;
  removeRef: (button: HTMLButtonElement | null) => void;
}) {
  return (
    <li className="own-documents__item">
      <div className="own-documents__text">
        <Paragraph data-size="sm" className="own-documents__name">
          {document.name}
        </Paragraph>

        {/* A status only when there is something to say: the panel is over its height budget.
            Progress as a number, not a bar: a bar takes a row, and uploads here last about 1.5 s.
            Revisit if a real backend has slow uploads. */}
        <Paragraph data-size="xs" className="own-documents__meta">
          {TYPE_LABEL[document.type]} · {fileSize(document.size)}
          {document.status === 'uploading' && ` · Laster opp … ${Math.round(document.progress)} %`}
        </Paragraph>

        {document.status === 'failed' && (
          <Paragraph data-size="xs" className="own-documents__error">
            {uploadErrorText(document.errorCode ?? 'failed')}
          </Paragraph>
        )}
      </div>

      {/* The name is in the label, or four «Fjern» cannot be told apart. */}
      <Button
        ref={removeRef}
        variant="tertiary"
        data-color="neutral"
        data-size="sm"
        aria-label={`Fjern ${document.name}`}
        onClick={onRemove}
      >
        <TrashIcon aria-hidden="true" />
      </Button>
    </li>
  );
}
