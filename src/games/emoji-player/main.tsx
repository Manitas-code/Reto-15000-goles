import { mountPage } from '../../app/mount';
import App from './App';
import { emojiPlayers } from '../../data/emoji-players';

window.GD_EMOJI = emojiPlayers;
mountPage(<App />, { teamPicker: false });
