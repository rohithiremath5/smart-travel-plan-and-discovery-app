import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}
export function AssistantConversation({
  messages,
  followUps,
  send,
  busy,
  disabled,
}: {
  messages: ConversationTurn[];
  followUps: string[];
  send: (text: string) => void;
  busy: boolean;
  disabled: boolean;
}) {
  const [question, setQuestion] = useState('');
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, busy]);
  const starters = [
    'Make this day more relaxed',
    'Suggest a culture-focused afternoon',
    'How can we keep this trip good value?',
  ];
  return (
    <section className="ai-conversation" aria-label="Travel assistant conversation">
      <div className="ai-stage-heading">
        <span className="eyebrow">A LITTLE LOCAL CURIOSITY</span>
        <h3>Talk through the possibilities.</h3>
        <p>Ask about this trip. Advice stays separate from your saved itinerary.</p>
      </div>
      <div
        ref={log}
        tabIndex={0}
        className="ai-conversation-log"
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {!messages.length && (
          <div className="ai-chat-empty">
            <MessageCircle aria-hidden="true" />
            <p>A slower morning. A different neighbourhood. Start with what you’re wondering.</p>
          </div>
        )}
        {messages.map((message, i) => (
          <article className={`ai-turn ai-turn-${message.role}`} key={i}>
            <span className="eyebrow">
              {message.role === 'user' ? 'YOUR QUESTION' : 'TRAVEL ASSISTANT · AI'}
            </span>
            <p>{message.text}</p>
          </article>
        ))}
        {busy && <p role="status">Thinking through your trip…</p>}
      </div>
      <div className="ai-question-ideas" aria-label="Question ideas">
        {(messages.length ? followUps : starters).map((text) => (
          <Button
            key={text}
            variant="secondary"
            disabled={disabled || busy}
            onClick={() => {
              setQuestion(text);
            }}
          >
            {text}
          </Button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) {
            send(question.trim());
            setQuestion('');
          }
        }}
      >
        <label className="field">
          <span>Your travel question</span>
          <textarea
            className="input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1200}
            rows={3}
            placeholder="What would make this day feel more like us?"
          />
        </label>
        <div className="ai-compose-footer">
          <small>No bookings, private documents or sensitive personal details.</small>
          <Button type="submit" disabled={disabled || !question.trim()} loading={busy}>
            <Send aria-hidden="true" />
            Ask the assistant
          </Button>
        </div>
      </form>
    </section>
  );
}
