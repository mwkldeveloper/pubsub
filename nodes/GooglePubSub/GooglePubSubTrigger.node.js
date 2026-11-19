const { PubSub } = require("@google-cloud/pubsub");
const { resourceName, messageData, copyAttributes } = require("../../lib/safe");

class GooglePubSubTrigger {
  constructor() {
    this.description = {
      displayName: "Google Pub/Sub Trigger",
      name: "googlePubSubTrigger",
      icon: "file:googlePubSub.svg",
      group: ["trigger"],
      version: 1,
      description: "從已經存在的 Pub/Sub subscription 收訊息。不會建立 subscription。",
      defaults: { name: "Google Pub/Sub Trigger" },
      inputs: [],
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
          displayName: "Subscription",
          name: "subscription",
          type: "string",
          default: "",
          required: true,
          description: "短名稱，或 projects/PROJECT/subscriptions/NAME。這個 subscription 要先存在。",
        },
        {
          displayName: "把 data 解析成 JSON",
          name: "decodeJson",
          type: "boolean",
          default: false,
          description: "Batch 狀態通知的內容在 attributes，data 通常是空的，保持關閉。",
        },
      ],
    };
  }

  async trigger() {
    const credentials = await this.getCredentials("googleApi");
    const projectId = this.getNodeParameter("projectId");
    const subscriptionName = resourceName(
      projectId,
      "subscriptions",
      this.getNodeParameter("subscription"),
    );
    const decodeJson = this.getNodeParameter("decodeJson");
    const pubsub = new PubSub({
      projectId,
      credentials: {
        client_email: credentials.email,
        private_key: String(credentials.privateKey || "").replace(/\\n/g, "\n"),
      },
    });
    // ponytail: at most 10 messages in flight. Ack runs after emit returns, so a later
    // node failure does not nack. Move the ack into the workflow only if that loss matters.
    const subscription = pubsub.subscription(subscriptionName, {
      flowControl: { maxMessages: 10, allowExcessMessages: false },
    });

    let notifyManual = () => {};
    let failManual = () => {};
    const onMessage = (message) => {
      let emitted = false;
      try {
        const data = messageData(message.data, decodeJson);
        this.emit([
          this.helpers.returnJsonArray([
            {
              messageId: message.id,
              publishTime: message.publishTime,
              data,
              attributes: copyAttributes(message.attributes),
            },
          ]),
        ]);
        emitted = true;
        message.ack();
        notifyManual();
      } catch (error) {
        if (!emitted) message.nack();
        failManual(error instanceof Error ? error.message : String(error));
      }
    };
    const onError = (error) => {
      const detail = error instanceof Error ? error.message : String(error);
      failManual(detail);
    };
    subscription.on("message", onMessage);
    subscription.on("error", onError);

    const closeFunction = async () => {
      notifyManual = () => {};
      failManual = () => {};
      subscription.removeListener("message", onMessage);
      subscription.removeListener("error", onError);
      await subscription.close();
    };

    const manualTriggerFunction = async () => {
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn();
        };
        const timer = setTimeout(() => {
          finish(() => reject(new Error("30 秒內沒有收到訊息")));
        }, 30000);
        notifyManual = () => finish(resolve);
        failManual = (detail) => finish(() => reject(new Error(detail)));
      });
    };

    return { closeFunction, manualTriggerFunction };
  }
}

exports.GooglePubSubTrigger = GooglePubSubTrigger;
