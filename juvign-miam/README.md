# Juvign’Miam Studio

A local visual application editor with French controls for middle-school students. Projects start blank or from optional restaurant and task-list examples. There is no prescribed lesson sequence or fixed number of screens, products or components.

Run `npm start`, then open http://127.0.0.1:4174. Node.js is required. There are no package dependencies or paid API calls.

## Building

Add screens, drag components into the preview or into groups, and edit their properties. Components can be duplicated, reordered and removed. The palette includes titles, text, images, buttons, text and number inputs, long text, selectors, switches, groups, lists, product lists, carts, separators and spacing. Images can come from the bundled collection or local files.

The main properties use plain labels. Data display is selected from a dropdown. Technical identifiers, mixed text expressions and detailed layout settings are available in expandable sections.

## Data and actions

Create text, number, boolean, list and calculated data. Lists support editable records and custom named fields, including photographs. Data labels are separate from internal identifiers.

Configure click, input-change and list-item events with ordered actions. Actions support setting values, adding or subtracting numbers, appending or removing list items, navigation, messages, cart operations, reset and nested conditions with AND/OR branches. Values can come from literals, data, input, list items, calculations, list lengths or cart totals.

## Testing and saving

Conception mode selects and arranges components. Tester mode executes the project with separate test data. The reset control restores initial data. The test-state panel shows data and action history. Unfinished data and screen references are reported in the footer.

Projects save automatically in this browser. Save a project file to transfer it, and import it to resume editing. Undo and redo cover project changes. Downloading an HTML application includes its runtime and images; it works offline, supports screen navigation and saves its own data locally. The editor and export use the same renderer and action interpreter.

The platform stores data locally; shared online databases and account services are not configured. The restaurant example uses simulated orders with no real payments or deliveries. Food photographs: Unsplash.
