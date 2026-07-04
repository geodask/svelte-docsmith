import { Popover as PopoverPrimitive } from 'bits-ui';
import Content from './popover-content.svelte';

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;

export {
	Root,
	Trigger,
	Content,
	//
	Root as Popover,
	Trigger as PopoverTrigger,
	Content as PopoverContent
};
