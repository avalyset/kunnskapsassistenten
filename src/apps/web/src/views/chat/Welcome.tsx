import { Heading } from '@digdir/designsystemet-react';

type WelcomeProps = {
  /** The signed-in user's first name. Figma hardcodes a name; this does not. */
  userName?: string;
};

/**
 * What a reader meets before the first question, not the shared `EmptyState`.
 * Both greeting lines are ONE heading with a break, since a second would be
 * an outline entry with nothing under it, and the name may be missing. The
 * suggestions are not here: they stand under the compose field, which
 * `ChatView` draws between the two.
 */
export function Welcome({ userName }: WelcomeProps) {
  return (
    <div className="ka-chat-greeting">
      <Heading data-size="lg" level={2}>
        {userName ? `Hei, ${userName} ` : 'Hei '}
        <span aria-hidden="true">👋</span>
        <br />
        Hva lurer du på?
      </Heading>
    </div>
  );
}
