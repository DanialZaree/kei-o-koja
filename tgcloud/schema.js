import { table, integer, text } from 'sdk/db';

export const chatEvents = table('chat_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: text('chat_id').notNull(),
  publicId: text('public_id').notNull(),
  title: text('title').notNull(),
  organizerName: text('organizer_name').notNull(),
  datesJson: text('dates_json').notNull(),
  placesJson: text('places_json'),
  status: text('status').default('OPEN'),
  messageId: integer('message_id'),
});

export const tgVotes = table('tg_votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  publicId: text('public_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  optionType: text('option_type').notNull(), // 'date' or 'place'
  optionIndex: integer('option_index').notNull(),
});

export const botSessions = table('bot_sessions', {
  userId: text('user_id').primaryKey(),
  chatId: text('chat_id').notNull(),
  step: text('step').notNull(), // 'awaiting_title' | 'awaiting_dates' | 'awaiting_places'
  draftTitle: text('draft_title'),
  draftDatesJson: text('draft_dates_json'),
  updatedAt: integer('updated_at').notNull(),
});
