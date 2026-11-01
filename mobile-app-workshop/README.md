# App Quest — Mobile application workshop proposal

## Concept

Build a small mobile task application through a guided beginner workshop, following the learning model of Code Quest. Students discover the finished application, then build their own version through short coding missions and observable experiments.

The workshop runs locally on a classroom computer. A phone-shaped interactive preview shows the application being built. The initial scope is a mobile web application, not a native Android or iOS package. Native packaging is a separate possible extension.

## Student project: Pocket Tasks

The finished application lets a student enter a task, add it to a list, mark it complete, filter tasks, delete a task and retain the list after reopening the application. Students can choose its title, accent color and empty-list message.

This subject makes inputs, events, conditions, application state and persistence visible through familiar actions. It requires no account, external API or paid service.

## Workshop experience

- A chapter rail shows the current mission and progress.
- A lesson panel offers a short explanation, one example and two concrete instructions.
- An editor preserves the student's cumulative HTML, CSS and JavaScript files, introducing each file only when needed.
- An interactive phone preview reflects the last verified version. Editing marks the preview as out of date until the next verification.
- Verification reports the first useful correction and tests behavior, rather than requiring one exact source expression.
- Practice steps require real interactions, including submitting a task, changing a filter and reopening the preview to check persistence.
- Short quizzes refer to the student's own visible code.
- Local progress, backup import/export and export of the student's application follow the existing workshop model.

## Proposed curriculum

Eight chapters, each containing three coding missions, one practice mission and one short quiz: 40 steps in total.

| Chapter | Coding missions | Observable practice |
| --- | --- | --- |
| 1. My first screen | Create a title, a welcome message and an empty-state section | Change the title and find it in the preview |
| 2. My visual identity | Set colors, spacing and button styles | Compare two themes and check readable text |
| 3. My first interaction | Create a button, connect an event and update visible text | Trigger the action twice and explain the result |
| 4. Entering a task | Add an input, read its value and reject blank submissions | Test empty text, spaces and a valid task |
| 5. Building the list | Introduce task objects, an array and a provided rendering function | Add three different tasks without replacing earlier ones |
| 6. Completing a task | Identify a task, toggle its completion and update the remaining count | Complete and reopen a task; observe both counter changes |
| 7. Finding and removing tasks | Add filters, show matching tasks and remove a selected task | Delete one task while preserving the others |
| 8. Keeping my data | Save state, restore it and handle missing or invalid saved data | Reopen the preview and complete a final end-to-end scenario |

Arrays and objects appear later than in the existing beginner game workshop. Introduce them explicitly, with guided examples and a supplied rendering scaffold. Avoid asking beginners to discover list rendering, event wiring and state management in the same mission.

## Learning and verification rules

Start with an empty student project and reveal only the scaffold required for the current mission. Keep accepted work editable, mark changed lines and allow restoration of the last verified version.

Check earlier working behavior alongside the new mission. Verification should catch blank tasks, incorrect counters, duplicate event listeners, filters that change stored data, deletion of the wrong task and lost saved data. Practice completion must depend on observed actions after verification.

Keep workshop progress separate from the application's task data. Run student code inside an isolated preview with a controlled interface; a broken student application must not erase workshop progress or prevent access to the editor.

## Mobile application acceptance

The student application uses portrait phone composition, readable labels, touch targets of at least 44 by 44 logical pixels, visible focus states and a scrollable list. The input and add action remain usable when the on-screen keyboard opens. Long task names wrap without hiding completion or deletion controls.

Verify the preview and the exported application separately. Browser simulation does not establish physical-device behavior; record device testing only when actually performed.

## Delivery scope

This folder currently contains the proposal only. The proposed implementation includes the local workshop, 40 learning steps, interactive preview, behavioral verification, independent local saves, workshop backups and an exportable mobile web application. It does not yet contain an implemented workshop or an installable application package.
