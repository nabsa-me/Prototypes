import { mount } from 'svelte';
import App from './App.svelte';
import './design-system/tokens.css';
import './design-system/global.css';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element');

mount(App, { target });
