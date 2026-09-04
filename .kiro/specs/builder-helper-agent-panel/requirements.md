# Requirements Document

## Introduction

This feature delivers the first vertical slice of the Vibe Helper Code-centered UI surface: a Kiro IDE extension that adds a Builder tab and a Helper tab to the right-hand agent panel area. Each tab hosts a chat interface where the user types a message, the message is sent to the corresponding agent (Builder or Helper), and the agent's response is streamed back and displayed in that tab.

This initial scope covers the two tabs, the message input, the send-to-agent flow, the receive-and-display of agent responses (including streaming), and the enforcement of the distinct roles and permissions of Builder versus Helper as they affect the panel experience. Downstream product concerns (Concept Ledger, Evidence analysis, Decision cards, Live Project Context persistence, MCP Core, SQLite) are out of scope for this spec and are only referenced where they constrain the panel's behavior.

The Builder Agent drives real implementation and is read/write/shell capable within the generated project workspace; its work stream (tool calls, file changes, commands, tests) is shown transparently. The Helper Agent is a read-only companion that explains concepts in the current context and cannot edit code, run shells, or confirm decisions. This distinction shapes what each tab renders and what actions each tab exposes.

## Glossary

- **Agent_Panel**: The right-hand side panel contributed by the Kiro extension that contains the Builder tab and the Helper tab.
- **Builder_Tab**: The Agent_Panel tab that hosts the interaction surface for the Builder Agent.
- **Helper_Tab**: The Agent_Panel tab that hosts the interaction surface for the Helper Agent.
- **Builder_Agent**: The agent that drives code implementation with read, write, and shell capability inside the generated project workspace, and whose tool calls, file changes, commands, and tests are shown transparently.
- **Helper_Agent**: The read-only companion agent that explains concepts in the current context and has no code-edit, shell, or decision-confirmation capability.
- **Active_Agent**: The Builder_Agent or Helper_Agent associated with whichever tab is currently selected.
- **Message_Input**: The free-text input control within a tab used to compose and submit a message to the tab's agent.
- **User_Message**: A message composed by the user in a tab and submitted to that tab's agent.
- **Agent_Response**: The reply produced by an agent in response to a User_Message, delivered as a stream of incremental content chunks that together form the complete reply.
- **Response_Stream**: The ordered sequence of incremental content chunks that compose a single Agent_Response before it completes.
- **Conversation_View**: The scrollable region within a tab that displays the ordered history of User_Messages and Agent_Responses for that tab.
- **Work_Stream_Item**: A transparent record of a Builder_Agent activity such as a tool call, file change, command execution, or test run, rendered in the Builder_Tab Conversation_View.
- **Agent_Adapter**: The extension component that invokes an agent through the Kiro host and returns the Response_Stream.
- **Extension**: The Kiro IDE extension that contributes the Agent_Panel.

## Requirements

### Requirement 1: Agent Panel with Builder and Helper tabs

**User Story:** As a user, I want a right-side panel with a Builder tab and a Helper tab, so that I can work with the Builder and Helper agents alongside my code.

#### Acceptance Criteria

1. WHEN the Extension activates, THE Extension SHALL contribute an Agent_Panel to the right-hand side panel area of the Kiro IDE within 3 seconds.
2. THE Agent_Panel SHALL present exactly two tabs labeled Builder_Tab and Helper_Tab.
3. WHEN the Agent_Panel is first displayed, THE Agent_Panel SHALL select the Builder_Tab as the active tab and render its Conversation_View with zero messages and an empty editable Message_Input.
4. WHEN the user selects a tab, THE Agent_Panel SHALL within 500 milliseconds mark the selected tab as active, render its Conversation_View and Message_Input, and mark the previously active tab as inactive.
5. WHEN the user switches away from a tab and later returns to it, THE Agent_Panel SHALL display that tab's previously accumulated Conversation_View content in its original order and restore any unsent Message_Input text.
6. THE Agent_Panel SHALL maintain the Builder_Tab conversation state and the Helper_Tab conversation state as independent stores such that a change to one tab's state does not alter the other tab's state.
7. IF rendering a tab's Conversation_View fails, THEN THE Agent_Panel SHALL display an error indication in that tab and SHALL preserve that tab's existing conversation state.

### Requirement 2: Composing and sending a message

**User Story:** As a user, I want to type a message and send it to the active tab's agent, so that I can ask the agent to build something or explain something.

#### Acceptance Criteria

1. THE active tab SHALL display a Message_Input control for composing a User_Message that accepts up to 10,000 characters.
2. WHEN the user submits a non-empty User_Message from the Message_Input, THE Agent_Panel SHALL append the User_Message to the active tab's Conversation_View and send it to the Active_Agent through the Agent_Adapter.
3. WHEN a User_Message is successfully submitted, THE Message_Input SHALL clear the submitted text.
4. IF the user submits a User_Message that is empty or contains only whitespace, THEN THE Agent_Panel SHALL reject the submission and SHALL NOT invoke the Active_Agent.
5. IF the user submits a User_Message that exceeds 10,000 characters, THEN THE Agent_Panel SHALL reject the submission, SHALL retain the composed text, and SHALL display a length-limit indication.
6. WHILE an Agent_Response for the active tab is in progress, THE Agent_Panel SHALL disable submission of a new User_Message in that tab until the in-progress Agent_Response completes or fails.
7. IF sending a submitted User_Message to the Active_Agent through the Agent_Adapter fails, THEN THE Agent_Panel SHALL display an error indication in the active tab and SHALL retain the User_Message content for resubmission.

### Requirement 3: Receiving and displaying streamed agent responses

**User Story:** As a user, I want to see the agent's response appear as it is generated, so that I get feedback quickly and can follow the agent's reasoning.

#### Acceptance Criteria

1. WHEN the Agent_Adapter begins delivering a Response_Stream for a submitted User_Message, THE Agent_Panel SHALL create an Agent_Response entry in the originating tab's Conversation_View.
2. WHEN a content chunk of the Response_Stream is received, THE Agent_Panel SHALL append the chunk to the corresponding Agent_Response entry in the order received within 200 milliseconds of receipt.
3. WHEN the Response_Stream completes, THE Agent_Panel SHALL mark the corresponding Agent_Response as complete and re-enable submission in that tab.
4. WHEN a Response_Stream begins, THE Agent_Panel SHALL display a visible in-progress indicator in the originating tab within 500 milliseconds and SHALL keep it visible while the Response_Stream is in progress.
5. WHEN a Response_Stream for the Builder_Tab is received WHILE the Helper_Tab is the active tab, THE Agent_Panel SHALL apply the streamed content to the Builder_Tab Conversation_View without switching the active tab.
6. WHEN an Agent_Response completes, THE Conversation_View SHALL display the full ordered set of chunks as a single Agent_Response.
7. IF a Response_Stream fails or stalls beyond 30 seconds without a new chunk, THEN THE Agent_Panel SHALL mark the Agent_Response as failed, SHALL retain content already received, SHALL display an error indication, and SHALL re-enable submission in that tab.

### Requirement 4: Builder tab transparent work stream

**User Story:** As a user, I want to see the Builder agent's tool calls, file changes, commands, and tests as they happen, so that I can follow how the agent is building my project.

#### Acceptance Criteria

1. WHEN the Builder_Agent performs a tool call, file change, command execution, or test run during an Agent_Response, THE Builder_Tab SHALL render a corresponding Work_Stream_Item in the Conversation_View within 500 milliseconds of the Agent_Adapter reporting the activity.
2. THE Builder_Tab SHALL render Work_Stream_Items in ascending order of the sequence in which the Agent_Adapter reports them, without reordering.
3. THE Builder_Tab SHALL render each Work_Stream_Item together with the Builder_Agent message content in a single ordered Conversation_View.
4. WHERE a Work_Stream_Item contains output exceeding 3 lines, THE Builder_Tab SHALL render that item collapsed by default and provide a control to expand and collapse its detail.
5. WHEN the user toggles a Work_Stream_Item's expand or collapse control, THE Builder_Tab SHALL change only that item's expanded state and preserve the expanded state of other Work_Stream_Items.
6. IF a reported tool call, command execution, or test run fails, THEN THE Builder_Tab SHALL render the corresponding Work_Stream_Item with a failure indication and SHALL retain the item in the Conversation_View.
7. THE Helper_Tab SHALL NOT render Work_Stream_Items.

### Requirement 5: Distinct Builder and Helper roles in the panel

**User Story:** As a user, I want the Builder and Helper tabs to reflect each agent's distinct role, so that I understand that Builder implements and Helper explains.

#### Acceptance Criteria

1. WHEN the user submits a User_Message from the Builder_Tab, THE Agent_Panel SHALL route the User_Message to the Builder_Agent and SHALL NOT route it to the Helper_Agent.
2. WHEN the user submits a User_Message from the Helper_Tab, THE Agent_Panel SHALL route the User_Message to the Helper_Agent and SHALL NOT route it to the Builder_Agent.
3. THE Helper_Tab SHALL present a chat-only interaction surface that excludes controls for code edits, shell execution, and decision confirmation.
4. WHILE the Builder_Agent is processing a User_Message submitted from the Builder_Tab, THE Helper_Tab SHALL remain enabled for the user to submit a User_Message and route it to the Helper_Agent.
5. WHEN the Active_Agent changes to the Builder_Agent or the Helper_Agent, THE Agent_Panel SHALL display a visible label that names the current Active_Agent as the Builder_Agent or the Helper_Agent.
6. IF routing a submitted User_Message to the target Builder_Agent or Helper_Agent fails, THEN THE Agent_Panel SHALL retain the unsent User_Message content and display an error indication that identifies the routing failure.

### Requirement 6: Agent invocation errors and unavailability

**User Story:** As a user, I want clear feedback when an agent cannot respond, so that I know the request failed and can retry.

#### Acceptance Criteria

1. IF the Agent_Adapter fails to start a Response_Stream for a submitted User_Message within 30 seconds of submission, THEN THE Agent_Panel SHALL display an error indication in the originating tab identifying that the request failed, SHALL re-enable submission in that tab, and SHALL retain the composed User_Message text for resubmission.
2. IF a Response_Stream terminates before completion due to an error, THEN THE Agent_Panel SHALL mark the corresponding Agent_Response as failed, SHALL retain all partial content already received, and SHALL re-enable submission in that tab.
3. WHEN an Agent_Response is marked as failed, THE Agent_Panel SHALL display an error indication in the corresponding tab that visually distinguishes the failed Agent_Response from a successfully completed Agent_Response.
4. IF the Active_Agent is unavailable when the user submits a User_Message, THEN THE Agent_Panel SHALL display an unavailability indication in the active tab, SHALL retain the composed User_Message text for resubmission, and SHALL re-enable submission in that tab.
5. WHEN an error indication or unavailability indication is displayed, THE Agent_Panel SHALL preserve the existing Conversation_View history for that tab without removing or modifying any prior Agent_Response or User_Message.
