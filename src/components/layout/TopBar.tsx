interface TopBarProps {
    itemCount: number;
}

export function TopBar({ itemCount }: TopBarProps) {
    return (
        <header className="topbar">
            <div className="brand"><span>My Stuff</span><b>AI</b></div>
            <span className="item-count">{itemCount} {itemCount === 1 ? 'item' : 'items'} total</span>
        </header>
    );
}
