import { createElement } from 'react';
import { mountPage } from '../../app/mount';
import App from './App';

mountPage(createElement(App), { teamPicker: true });
