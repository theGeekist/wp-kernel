<script setup lang="ts">
export interface Section {
	readonly title: string;
	readonly items?: string[];
	readonly body?: string;
}

type PathBadge = 'required' | 'optional';

const props = withDefaults(
	defineProps<{
		id?: string;
		title: string;
		path: string;
		summary?: string;
		badge?: PathBadge;
		sections?: Section[];
	}>(),
	{
		sections: () => [],
	}
);

const badgeLabel: Record<PathBadge, string> = {
	required: 'Required',
	optional: 'Optional',
};
</script>

<template>
<section :id="props.id ?? props.path" class="config-card">
		<header class="config-card__header">
			<div>
				<p class="config-card__path">{{ props.path }}</p>
				<h3 class="config-card__title">{{ props.title }}</h3>
				<p v-if="props.summary" class="config-card__summary">
					{{ props.summary }}
				</p>
			</div>
			<span v-if="props.badge" class="config-card__badge">
				{{ badgeLabel[props.badge] }}
			</span>
		</header>

		<div v-if="props.sections?.length" class="config-card__sections">
			<article v-for="section in props.sections" :key="section.title">
				<h4>{{ section.title }}</h4>
				<p v-if="section.body">{{ section.body }}</p>
				<ul v-if="section.items?.length">
					<li v-for="item in section.items" :key="item">{{ item }}</li>
				</ul>
			</article>
		</div>
	</section>
</template>

<style scoped>
.config-card {
	border: 1px solid var(--vp-c-divider);
	border-radius: 12px;
	padding: 1.25rem;
	background: var(--vp-c-bg-soft);
	scroll-margin-top: 96px;
}

.config-card + .config-card {
	margin-top: 1rem;
}

.config-card__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 0.75rem;
}

.config-card__path {
	font-family: var(--vp-font-family-mono);
	font-size: 0.85rem;
	color: var(--vp-c-text-2);
	margin: 0 0 0.1rem;
}

.config-card__title {
	margin: 0;
	font-size: 1.05rem;
	color: var(--vp-c-text-1);
}

.config-card__summary {
	margin: 0.25rem 0 0;
	color: var(--vp-c-text-2);
}

.config-card__badge {
	font-size: 0.75rem;
	padding: 0.2rem 0.55rem;
	border-radius: 999px;
	border: 1px solid var(--vp-c-brand-1);
	color: var(--vp-c-brand-1);
	white-space: nowrap;
}

.config-card__sections {
	margin-top: 1rem;
	display: grid;
	gap: 0.9rem;
}

.config-card__sections h4 {
	margin: 0 0 0.25rem;
	font-size: 0.95rem;
}

.config-card__sections ul {
	margin: 0.25rem 0 0;
	padding-left: 1.1rem;
}
</style>
