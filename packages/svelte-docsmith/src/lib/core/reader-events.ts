/**
 * Reader events: the reader actions only svelte-docsmith can see, which it
 * hands to the author's reader event handler (the module named by
 * `docsmith({ readerEvents })`). The library sends them nowhere itself.
 *
 * Every event carries a snake_case `type`, so a handler can forward it to any
 * analytics provider as is (`capture(event.type, event)`), and `path`, the page
 * the reader was on: the current path with any trailing slash stripped, so a
 * page is one path whatever the site's `trailingSlash`. Adding an event or a field is a minor; renaming or
 * removing one is a major.
 */

/** A reader voted on "Was this page helpful?", once per page. */
export interface FeedbackEvent {
	type: 'feedback';
	path: string;
	vote: 'up' | 'down';
}

/** A reader followed "Edit this page" or "Open an issue" after a "No" vote. */
export interface FeedbackLinkEvent {
	type: 'feedback_link';
	path: string;
	link: 'edit' | 'issue';
}

/**
 * A reader searched: one event each time the search dialog is open, sent when
 * they pick a result or close it. Never sent for a query left empty.
 */
export interface SearchEvent {
	type: 'search';
	path: string;
	/** The query as the reader last left it, trimmed. Raw reader input. */
	query: string;
	/** How many results that query found. */
	results: number;
	/** The path of the result the reader picked, or `null` when they closed without one. */
	picked: string | null;
}

/** A reader landed on a page that doesn't exist. `path` is the missing URL. */
export interface NotFoundEvent {
	type: 'not_found';
	path: string;
	/** The page that linked here, from `document.referrer`, or `null` when there is none. */
	referrer: string | null;
}

/** An item of the page header's Copy page menu. */
export type PageAction =
	| 'copy_markdown'
	| 'view_markdown'
	| 'open_chatgpt'
	| 'open_claude'
	| 'copy_mcp_url'
	| 'copy_mcp_setup';

/** A reader used an item of the page header's Copy page menu. */
export type PageActionEvent =
	| { type: 'page_action'; path: string; action: Exclude<PageAction, 'copy_mcp_setup'> }
	| {
			type: 'page_action';
			path: string;
			action: 'copy_mcp_setup';
			/** The editor whose MCP setup the reader copied, as the menu names it. */
			editor: string;
	  };

/** A reader copied a code block. */
export interface CopyCodeEvent {
	type: 'copy_code';
	path: string;
	/** The code block's language, or `null` when it has none. */
	language: string | null;
	/** A markdown fence, or a `LiveExample`'s source panel. */
	source: 'fence' | 'live_example';
}

/** Something a reader did on a docs site that only svelte-docsmith can see. */
export type ReaderEvent =
	FeedbackEvent | FeedbackLinkEvent | SearchEvent | NotFoundEvent | PageActionEvent | CopyCodeEvent;

/**
 * The default export of the module `docsmith({ readerEvents })` names. It
 * receives every reader event, only ever in the browser.
 */
export type ReaderEventHandler = (event: ReaderEvent) => void;
