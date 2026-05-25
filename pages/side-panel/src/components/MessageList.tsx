import { memo } from 'react';
import { Actors, type Message } from '@extension/storage';
import AgentMessage from './AgentMessage';
import UserMessage from './UserMessage';
import StatusRow from './StatusRow';
import ResultsCard from './ResultsCard';

const RESULTS_PREFIX = 'DOT_RESULTS_SAVED::';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
  /** Resend a user message as a new task. */
  onRetry?: (userContent: string) => void;
  /** Pre-fill the input box with a user message for the user to tweak. */
  onEdit?: (userContent: string) => void;
  /** Disable retry/edit while the agent is running. */
  actionsDisabled?: boolean;
}

/** Walk backwards from idx to find the most recent USER message content. */
function findPrecedingUserContent(messages: Message[], idx: number): string | null {
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].actor === Actors.USER) return messages[i].content;
  }
  return null;
}

export default memo(function MessageList({ messages, onRetry, onEdit, actionsDisabled }: MessageListProps) {
  return (
    <div className="max-w-full space-y-5 pb-2">
      {messages.map((message, index) => {
        const precedingUser = message.actor !== Actors.USER ? findPrecedingUserContent(messages, index) : null;
        return (
          <MessageBlock
            key={`${message.actor}-${message.timestamp}-${index}`}
            message={message}
            isSameActor={index > 0 ? messages[index - 1].actor === message.actor : false}
            isLatest={index === messages.length - 1}
            onRetry={precedingUser && onRetry ? () => onRetry(precedingUser) : undefined}
            onEdit={onEdit ? () => onEdit(message.content) : undefined}
            actionsDisabled={actionsDisabled}
          />
        );
      })}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isSameActor: boolean;
  isLatest: boolean;
  onRetry?: () => void;
  onEdit?: () => void;
  actionsDisabled?: boolean;
}

function MessageBlock({ message, isSameActor, isLatest, onRetry, onEdit, actionsDisabled }: MessageBlockProps) {
  if (!message.actor) {
    console.error('No actor found');
    return <div />;
  }

  if (message.actor === Actors.SYSTEM) {
    return <StatusRow message={message} />;
  }

  if (message.actor === Actors.USER) {
    return <UserMessage message={message} onEdit={onEdit} actionsDisabled={actionsDisabled} />;
  }

  if (message.content.startsWith(RESULTS_PREFIX)) {
    const resultId = message.content.slice(RESULTS_PREFIX.length).split('::')[0];
    return <ResultsCard resultId={resultId} />;
  }

  const isProgress = message.content === 'Showing progress...';
  return (
    <AgentMessage
      message={message}
      isActive={isProgress && isLatest}
      showHeader={!isSameActor}
      onRetry={onRetry}
      actionsDisabled={actionsDisabled}
    />
  );
}
