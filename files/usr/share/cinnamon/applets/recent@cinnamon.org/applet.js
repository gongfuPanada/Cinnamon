const DocInfo = imports.misc.docInfo;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const Applet = imports.ui.applet;

function MyPopupMenuItem()
{
    this._init.apply(this, arguments);
}

MyPopupMenuItem.prototype =
{
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,
    _init: function(icon, text, params)
    {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);
        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });
        this.icon = icon;
        this.box.add(this.icon);
        this.label = new St.Label({ text: text });
        this.box.add(this.label);
        this.addActor(this.box);
    }
};

function MyMenu(launcher, orientation) {
    this._init(launcher, orientation);
}

MyMenu.prototype = {
    __proto__: PopupMenu.PopupMenu.prototype,
    
    _init: function(launcher, orientation) {
        this._launcher = launcher;        
                
        PopupMenu.PopupMenu.prototype._init.call(this, launcher.actor, 0.0, orientation, 0);
        Main.uiGroup.add_actor(this.actor);
        this.actor.hide();            
    }
}

function MyApplet(orientation) {
    this._init(orientation);
}

MyApplet.prototype = {
    __proto__: Applet.IconApplet.prototype,

    _init: function(orientation) {        
        Applet.IconApplet.prototype._init.call(this, orientation);
        
        try {        
            this.set_applet_icon_name("document-open-recent");
            this.set_applet_tooltip(_("Recent documents"));
            
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new MyMenu(this, orientation);
            this.menuManager.addMenu(this.menu);            
                                                                
            this.RecentManager = new DocInfo.DocManager();
            this._display();
            this.RecentManager.connect('changed', Lang.bind(this, this._redisplay));
        }
        catch (e) {
            global.logError(e);
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();        
    },
    
    _display: function() {
        for (let id = 0; id < 15 && id < this.RecentManager._infosByTimestamp.length; id++) {
            let icon = this.RecentManager._infosByTimestamp[id].createIcon(22);
            let menuItem = new MyPopupMenuItem(icon, this.RecentManager._infosByTimestamp[id].name, {});
            this.menu.addMenuItem(menuItem);
            menuItem.connect('activate', Lang.bind(this, this._launchFile, this.RecentManager._infosByTimestamp[id].uri));
        }
        if (this.RecentManager._infosByTimestamp.length > 0) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            let icon = new St.Icon({ icon_name: 'edit-clear', icon_type: St.IconType.SYMBOLIC, icon_size: 22 });
            let menuItem = new MyPopupMenuItem(icon, 'Clear list', {});
            this.menu.addMenuItem(menuItem);
            menuItem.connect('activate', Lang.bind(this, this._clearAll));
        }
    },
    
    _redisplay: function() {
        this.menu.removeAll();
        this._display();
    },

    _launchFile: function(a, b, c) {        
        Gio.app_info_launch_default_for_uri(c, global.create_app_launch_context());
    },
    
    _clearAll: function() {
        let GtkRecent = new Gtk.RecentManager();
        GtkRecent.purge_items();
    },
    
    destroy: function() {
        this.RecentManager.disconnectAll();
        this.actor._delegate = null;
        this.menu.destroy();
        this.actor.destroy();
        this.emit('destroy');
    }
};

function main(metadata, orientation) {  
    let myApplet = new MyApplet(orientation);
    return myApplet;      
}