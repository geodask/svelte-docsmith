<script lang="ts">
	import * as Alert from '$shared/ui/shadcn/alert';
	import { content } from '../config';

	const Icon = content.icon;
</script>

<Alert.Root
	class="text-start bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 rounded-md"
>
	<Icon class="!text-yellow-600 dark:text-yellow-400" size={18} />
	<Alert.Title>{content.title}</Alert.Title>
	<Alert.Description>
		{content.description}
	</Alert.Description>
</Alert.Root>
