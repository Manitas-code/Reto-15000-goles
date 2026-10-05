import { emojiPlayers } from '../../data/emoji-players';
import { initEmojiPlayer } from './controller';
import { bootShared } from '../../shared/bootstrap';

window.GD_EMOJI = emojiPlayers;
initEmojiPlayer();
bootShared('language-first');
