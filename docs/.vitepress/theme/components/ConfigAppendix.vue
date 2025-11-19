<script setup lang="ts">
import ConfigField, { type Section } from './ConfigField.vue';

export interface ConfigFieldDescriptor {
	readonly id?: string;
	readonly title: string;
	readonly path: string;
	readonly summary?: string;
	readonly badge?: 'required' | 'optional';
	readonly sections?: Section[];
}

const props = withDefaults(
	defineProps<{
		fields: ConfigFieldDescriptor[];
		title?: string;
	}>(),
	{
		fields: () => [],
		title: 'Configuration reference',
	}
);
</script>

<template>
	<div class="config-appendix__content">
		<ConfigField
			v-for="field in props.fields"
			:key="field.path"
			v-bind="field"
		/>
	</div>
</template>

<style scoped>
.config-appendix__content {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
</style>
