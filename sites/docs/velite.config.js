import { defineConfig, s } from 'velite';

export default defineConfig({
	root: './src/routes',
	collections: {
		docs: {
			name: 'Doc', // collection type name
			pattern: 'docs/**/*.md', // content files glob pattern
			schema: s.object({
				// Frontmatter drives the sidebar nav (PLAN.md §2.6): nav is derived
				// from content, never hand-written.
				title: s.string(),
				description: s.string().optional(),
				// `section` groups pages in the sidebar; `order` sorts within a section.
				section: s.string().optional(),
				order: s.number().default(0),
				// URL of the rendered page, derived from the file path.
				path: s.path().transform((path) => {
					const parts = path.split('/');
					parts.pop(); // Remove the last part ("+page")
					return '/' + parts.join('/'); // Add leading slash
				})
			})
		}
	}
});
