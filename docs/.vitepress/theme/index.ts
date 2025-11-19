import DefaultTheme from 'vitepress/theme';
import './mermaid.css';
import ConfigField from './components/ConfigField.vue';
import ConfigAppendix from './components/ConfigAppendix.vue';

export default {
	...DefaultTheme,
	enhanceApp({ app }) {
		DefaultTheme.enhanceApp?.({ app });
		app.component('ConfigField', ConfigField);
		app.component('ConfigAppendix', ConfigAppendix);
	},
};
