import { defineConfig, s } from 'velite';

export default defineConfig({
	root: './src/routes',
	collections: {
		docs: {
			name: 'Doc', // collection type name
			pattern: 'docs/**/*.md', // content files glob pattern
			schema: s.object({
				toc: s.toc({ minDepth: 2 }),
				path: s.path().transform((path) => {
					const parts = path.split('/');
					parts.pop(); // Remove the last part ("+page")
					return '/' + parts.join('/'); // Add leading slash
				})
			})
		}
	}
});
