<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Application appearance is managed by the shared ThemeProvider, with semantic CSS overrides on the root element; this keeps every page and portal consistent and persists the user's choice.
- The Orders route is Order Management (Incoming / Production Queue / Ready for Pickup) over useActiveOrders; item-level preparation goes through the start_item_preparation/mark_item_prepared RPCs, which allocate FIFO and mark orders ready only when fully prepared.
- Rush acceptance uses bulk_accept_item_orders for authoritative FIFO whole-order preview/commit with snapshot revalidation and storefront locking; partial customer acceptance is unsupported, so payment totals and item preparation quantities remain unchanged.
