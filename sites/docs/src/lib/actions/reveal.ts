/**
 * Progressive reveal-on-scroll. Content is fully visible by default; this action
 * only *enhances* when JS, IntersectionObserver, and motion are all available.
 *
 * Crucially it is self-healing: it can only ever *transition content into view*,
 * never leave it hidden. A guaranteed fallback timer shows the element even if
 * the observer never fires (headless renderers, background tabs, misfires), so a
 * reveal can never ship a blank section.
 */
interface RevealOptions {
	/** Stagger delay in ms before this element animates in. */
	delay?: number;
}

const REDUCED = () =>
	typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	// No JS-capable environment or reduced motion: leave content exactly as
	// rendered — fully visible. The animation is pure enhancement.
	if (typeof IntersectionObserver === 'undefined' || REDUCED()) return;

	const { delay = 0 } = options;
	let shown = false;

	const show = () => {
		if (shown) return;
		shown = true;
		node.style.opacity = '1';
		node.style.transform = 'none';
		node.addEventListener(
			'transitionend',
			() => {
				node.style.willChange = '';
				node.style.transition = '';
			},
			{ once: true }
		);
	};

	// Enter the pre-animation state only now that we know we can (and will) animate back out of it.
	node.style.opacity = '0';
	node.style.transform = 'translateY(16px)';
	node.style.transition = `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`;
	node.style.willChange = 'opacity, transform';

	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				show();
				observer.disconnect();
			}
		},
		{ threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
	);
	observer.observe(node);

	// Bulletproof: never leave content hidden, whatever happens to the observer.
	// A late fire after the observer already showed the node is a harmless no-op
	// (guarded by `shown`).
	const fallback = setTimeout(() => {
		show();
		observer.disconnect();
	}, 1200);

	return {
		destroy() {
			clearTimeout(fallback);
			observer.disconnect();
		}
	};
}
