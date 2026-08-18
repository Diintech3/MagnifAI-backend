const fs = require('fs');
const path = require('path');

const postmanCollection = {
  info: {
    _postman_id: "ab67df21-72da-4a5e-bd5d-a190a2a16d58",
    name: "MagnifAI Promote WhatsApp Automation API Collection",
    description: "Complete, production-ready Postman Collection for MagnifAI Promote & WhatsApp Automation. Includes SSO & Configuration, Meta Templates Management, Contact Audience Groups & Members Sync, Broadcast Campaigns Creation & Dispatch, Outbox Direct Template Messaging, and Conversations & Live Chat.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    {
      key: "base_url",
      value: "http://localhost:4000",
      type: "string"
    },
    {
      key: "auth_token",
      value: "YOUR_CEO_JWT_TOKEN",
      type: "string"
    }
  ],
  item: [
    {
      name: "1. Configuration & WABA Setup",
      item: [
        {
          name: "Get WhatsApp WABA Configuration",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/config",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "config"]
            },
            description: "Fetches WhatsApp Business Account (WABA) credentials, phone number ID, connection status, and linked client profile for the active CEO."
          },
          response: []
        },
        {
          name: "Get Meta SSO Login Link",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/sso-link",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "sso-link"]
            },
            description: "Generates a single-sign-on (SSO) URL to open the Whats AI WABA self-service connection portal."
          },
          response: []
        },
        {
          name: "Connect / Save WABA Credentials",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                phoneNumberId: "109823485723948",
                wabaId: "982348572394812",
                accessToken: "EAAPQNJxvtoUBSIY0o5dXFEg..."
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/waba",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "waba"]
            },
            description: "Manually configures and saves WhatsApp Cloud API credentials (Phone Number ID, WABA ID, Access Token) for the CEO account."
          },
          response: []
        },
        {
          name: "Disconnect / Reset WhatsApp Account",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/waba",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "waba"]
            },
            description: "Resets the WhatsApp connection for the CEO and unlinks the client ID."
          },
          response: []
        }
      ]
    },
    {
      name: "2. Templates Management",
      item: [
        {
          name: "List WhatsApp Message Templates",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/templates",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "templates"]
            },
            description: "Retrieves all message templates registered on Meta WhatsApp Cloud API along with approval statuses (APPROVED, PENDING, REJECTED)."
          },
          response: []
        },
        {
          name: "Create WhatsApp Message Template",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "ceo_exclusive_update",
                category: "MARKETING",
                language: "en",
                components: [
                  {
                    type: "BODY",
                    text: "Hello {{1}},\n\nHere is an exclusive update from {{2}}.\n\nThank you for connecting with us!"
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/templates",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "templates"]
            },
            description: "Submits a new WhatsApp message template with variable placeholders (e.g. {{1}}, {{2}}) to Meta Cloud API for approval."
          },
          response: []
        },
        {
          name: "Delete WhatsApp Template",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/templates/ceo_exclusive_update",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "templates", "ceo_exclusive_update"]
            },
            description: "Deletes a message template from Meta Cloud API and Whats AI."
          },
          response: []
        }
      ]
    },
    {
      name: "3. Contact Groups & Member Sync",
      item: [
        {
          name: "List WhatsApp Contact Groups",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/groups",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "groups"]
            },
            description: "Lists all audience contact groups with live active member counts synchronized across MagnifAI People Directory and Whats AI."
          },
          response: []
        },
        {
          name: "Create WhatsApp Contact Group",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "VIP Investors & Clients",
                description: "Target group for high-priority announcements and campaigns"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/groups",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "groups"]
            },
            description: "Creates a new WhatsApp contact group for launching targeted broadcast campaigns."
          },
          response: []
        },
        {
          name: "Get Group Members",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/groups/:groupId/members",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "groups", ":groupId", "members"],
              variable: [{ key: "groupId", value: "6a82d07424d0dbb08e022ac7", description: "WhatsApp or MagnifAI Group ID" }]
            },
            description: "Fetches all contact members belonging to a specific WhatsApp group with their phone numbers and sources."
          },
          response: []
        },
        {
          name: "Sync / Bulk Update Group Members",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                selectedContacts: [
                  { name: "Anand Mohan", phone: "917970906978" },
                  { name: "Raj Singh", phone: "918726525782" },
                  { name: "Vijay Wiz", phone: "918147540362" }
                ],
                removedPhones: []
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/groups/:groupId/sync-members",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "groups", ":groupId", "sync-members"],
              variable: [{ key: "groupId", value: "6a82d07424d0dbb08e022ac7", description: "WhatsApp or MagnifAI Group ID" }]
            },
            description: "Bulk adds selected contacts from People Directory or Business Cards into a group and synchronizes them across MongoDB and Whats AI."
          },
          response: []
        },
        {
          name: "Delete WhatsApp Contact Group",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/groups/:groupId",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "groups", ":groupId"],
              variable: [{ key: "groupId", value: "6a82d07424d0dbb08e022ac7", description: "WhatsApp Group ID" }]
            },
            description: "Deletes a WhatsApp contact group from Whats AI."
          },
          response: []
        }
      ]
    },
    {
      name: "4. Broadcast Campaigns & Dispatch",
      item: [
        {
          name: "List Broadcast Campaigns History",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/campaigns",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "campaigns"]
            },
            description: "Fetches all launched and draft broadcast campaigns with real-time delivery logs (Sent: X/Total) and status."
          },
          response: []
        },
        {
          name: "Create Broadcast Campaign",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Festival Greetings 2026",
                template: "ai_assistant",
                templateId: "ai_assistant",
                targetGroup: "6a82d07424d0dbb08e022ac7",
                groupId: "6a82d07424d0dbb08e022ac7",
                variablesMapping: {
                  "1": "Recipient Contact Name",
                  "2": "Lakshmi Raj Singh"
                },
                scheduledAt: null
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/campaigns",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "campaigns"]
            },
            description: "Creates a new WhatsApp broadcast campaign mapped to an approved template, dynamic variable mappings, and a target contact group."
          },
          response: []
        },
        {
          name: "Send / Dispatch Broadcast Campaign",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/campaigns/:campaignId/send",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "campaigns", ":campaignId", "send"],
              variable: [{ key: "campaignId", value: "6a84578e5bccf706d7b7dd37", description: "Campaign ID to broadcast" }]
            },
            description: "Triggers immediate live broadcast dispatch to all contacts in the campaign's target group via Meta WhatsApp Cloud API and updates status to completed."
          },
          response: []
        },
        {
          name: "Edit WhatsApp Campaign",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "PATCH",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                name: "Updated Campaign Title",
                scheduledAt: "2026-08-20T10:00:00.000Z"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/campaigns/:campaignId",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "campaigns", ":campaignId"],
              variable: [{ key: "campaignId", value: "6a84578e5bccf706d7b7dd37", description: "Campaign ID" }]
            },
            description: "Updates campaign details or scheduling time in Whats AI."
          },
          response: []
        }
      ]
    },
    {
      name: "5. Direct Outbox / Send Template Message",
      item: [
        {
          name: "Send Direct WhatsApp Template Message",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                phone: "917970906978",
                templateName: "ai_assistant",
                language: "en",
                variables: [
                  { key: "1", value: "Lakshmi Raj Singh" }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/send-template",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "send-template"]
            },
            description: "Sends an approved WhatsApp template directly to any specific mobile number."
          },
          response: []
        }
      ]
    },
    {
      name: "6. Conversations & Live Chat",
      item: [
        {
          name: "List Live Customer Conversations",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations"]
            },
            description: "Retrieves all active 1-on-1 customer conversations for the CEO with unread counts and last message previews."
          },
          response: []
        },
        {
          name: "Get Conversation Messages & Thread",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations/:conversationId/messages",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations", ":conversationId", "messages"],
              variable: [{ key: "conversationId", value: "6a6728e40686214cf0fc6a43", description: "Conversation ID" }]
            },
            description: "Retrieves full message history (inbound customer messages and outbound replies) for a specific conversation."
          },
          response: []
        },
        {
          name: "Send Manual Text Reply",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                text: "Thank you for reaching out! How can I assist you further?"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations/:conversationId/reply",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations", ":conversationId", "reply"],
              variable: [{ key: "conversationId", value: "6a6728e40686214cf0fc6a43", description: "Conversation ID" }]
            },
            description: "Dispatches a manual WhatsApp text response to a customer thread."
          },
          response: []
        },
        {
          name: "Send Media / Image Reply",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                mediaUrl: "https://pub-4dbe4900ba004dd285d2a9e684b7c8c7.r2.dev/brochure.pdf",
                mediaType: "document",
                caption: "Here is the requested brochure"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations/:conversationId/reply-media",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations", ":conversationId", "reply-media"],
              variable: [{ key: "conversationId", value: "6a6728e40686214cf0fc6a43", description: "Conversation ID" }]
            },
            description: "Sends an image, video, or PDF document reply to a customer."
          },
          response: []
        },
        {
          name: "Toggle AI Auto-Reply Assistant",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "PUT",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                aiEnabled: true
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations/:conversationId/toggle-ai",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations", ":conversationId", "toggle-ai"],
              variable: [{ key: "conversationId", value: "6a6728e40686214cf0fc6a43", description: "Conversation ID" }]
            },
            description: "Enables or disables the 24/7 AI conversational agent for a specific customer chat thread."
          },
          response: []
        },
        {
          name: "Mark Conversation As Read",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "PUT",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations/:conversationId/mark-read",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations", ":conversationId", "mark-read"],
              variable: [{ key: "conversationId", value: "6a6728e40686214cf0fc6a43", description: "Conversation ID" }]
            },
            description: "Clears unread message count for a conversation."
          },
          response: []
        },
        {
          name: "Resolve / Close Conversation",
          request: {
            auth: {
              type: "bearer",
              bearer: [{ key: "token", value: "{{auth_token}}", type: "string" }]
            },
            method: "PUT",
            header: [],
            url: {
              raw: "{{base_url}}/api/app/whatsapp/conversations/:conversationId/resolve",
              host: ["{{base_url}}"],
              path: ["api", "app", "whatsapp", "conversations", ":conversationId", "resolve"],
              variable: [{ key: "conversationId", value: "6a6728e40686214cf0fc6a43", description: "Conversation ID" }]
            },
            description: "Marks a conversation as resolved and closes the active ticket."
          },
          response: []
        }
      ]
    }
  ]
};

const filePath = path.resolve(__dirname, '../../Promote_WhatsApp_API_Postman_Collection.json');
fs.writeFileSync(filePath, JSON.stringify(postmanCollection, null, 2), 'utf-8');
console.log('Successfully written updated Postman collection to:', filePath);
