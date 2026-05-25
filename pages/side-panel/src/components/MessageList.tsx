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
}

export default memo(function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-full space-y-4 pb-2">
      {messages.map((message, index) => (
        <MessageBlock
          key={`${message.actor}-${message.timestamp}-${index}`}
          message={message}
          isSameActor={index > 0 ? messages[index - 1].actor === message.actor : false}
          isLatest={index === messages.length - 1}
        />
      ))}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isSameActor: boolean;
  isLatest: boolean;
}

function MessageBlock({ message, isSameActor, isLatest }: MessageBlockProps) {
  if (!message.actor) {
    console.error('No actor found');
    return <div />;
  }

  if (message.actor === Actors.SYSTEM) {
    return <StatusRow message={message} />;
  }

  if (message.actor === Actors.USER) {
    return <UserMessage message={message} />;
  }

  if (message.content.startsWith(RESULTS_PREFIX)) {
    const resultId = message.content.slice(RESULTS_PREFIX.length).split('::')[0];
    return <ResultsCard resultId={resultId} />;
  }

  const isProgress = message.content === 'Showing progress...';
  return <AgentMessage message={message} isActive={isProgress && isLatest} showHeader={!isSameActor} />;
}
