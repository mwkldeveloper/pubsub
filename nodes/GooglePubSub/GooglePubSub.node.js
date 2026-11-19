const { PubSub } = require("@google-cloud/pubsub");
const { resourceName, attributeMap, messageData } = require("../../lib/safe");

class GooglePubSub {
  constructor() {
    this.description = {
      displayName: "Google Pub/Sub",
      name: "googlePubSub",
      icon: "file:googlePubSub.svg",
      group: ["output"],
      version: 1,
      description: "發一則訊息到已經存在的 Pub/Sub topic。不會建立 topic。",
      defaults: { name: "Google Pub/Sub" },
      inputs: ["main"],
      outputs: ["main"],
      credentials: [{ name: "googleApi", required: true }],
      properties: [
        {
          displayName: "Project ID",
          name: "projectId",
          type: "string",
          default: "font2art-staging",
          required: true,
        },
        {
          displayName: "Topic",
          name: "topic",
          type: "string",
          default: "",
          required: true,
          description: "短名稱，或 projects/PROJECT/topics/NAME。",
        },
        {
          displayName: "Message",
          name: "message",
          type: "string",
          default: "",
          description: "訊息本文。最大 1MB。",
        },
        {
          displayName: "Attributes",
          name: "attributes",
          type: "json",
          default: "{}",
          description: "字串對照表，例如 Batch 用的 JobName。",
        },
      ],
    };
  }

  async execute() {
    const credentials = await this.getCredentials("googleApi");
    const projectId = this.getNodeParameter("projectId", 0);
    const pubsub = new PubSub({
      projectId,
      credentials: {
        client_email: credentials.email,
        private_key: String(credentials.privateKey || "").replace(/\\n/g, "\n"),
      },
    });
    const items = this.getInputData();
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const topicName = resourceName(projectId, "topics", this.getNodeParameter("topic", i));
      const body = this.getNodeParameter("message", i);
      const data = Buffer.from(String(body));
      messageData(data, false);
      const attributes = attributeMap(this.getNodeParameter("attributes", i));
      const messageId = await pubsub.topic(topicName).publishMessage({ data, attributes });
      out.push({ json: { messageId, topic: topicName } });
    }
    return [out];
  }
}

exports.GooglePubSub = GooglePubSub;
