// packages/rabbitmq/src/rabbitmq.ts
import amqp from "amqplib";
import type { ChannelModel, Channel, ConsumeMessage } from "amqplib";
import logger from "./logger";

const EXCHANGE_NAME = "facebook_events";
const RECONNECT_INTERVAL = 3000;

let connection: ChannelModel | null = null;
let publisherChannel: Channel | null = null;

/** Lazy singleton with auto-reconnect */
async function getConnection(): Promise<ChannelModel> {
  if (connection) return connection;

  const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

  while (true) {
    try {
      const conn = await amqp.connect(url);
      logger.info("[RabbitMQ] Connected successfully");

      conn.on("error", (err) => {
        logger.error("[RabbitMQ] Connection error", err);
        connection = null;
      });

      conn.on("close", () => {
        logger.warn("[RabbitMQ] Connection closed — reconnecting...");
        connection = null;
      });

      connection = conn;
      return connection;
    } catch (err) {
      logger.error(
        `[RabbitMQ] Failed to connect to ${url} — retrying in ${RECONNECT_INTERVAL}ms`,
        err,
      );
      await new Promise((r) => setTimeout(r, RECONNECT_INTERVAL));
    }
  }
}

/** Publisher channel (singleton + survives reconnect) */
export async function getPublisherChannel(): Promise<Channel> {
  if (publisherChannel) return publisherChannel;

  const conn = await getConnection();
  const ch = await conn.createChannel();

  await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
  logger.info(`[RabbitMQ] Exchange '${EXCHANGE_NAME}' asserted`);

  ch.on("error", (err) => {
    logger.error("[Publisher Channel] Error", err);
    publisherChannel = null;
  });
  ch.on("close", () => {
    logger.warn("[Publisher Channel] Closed");
    publisherChannel = null;
  });

  publisherChannel = ch;
  return publisherChannel;
}

/** Publish event */
export async function publishEvent(
  routingKey: string,
  message: any,
): Promise<void> {
  const ch = await getPublisherChannel();

  const content = Buffer.from(JSON.stringify(message));
  const sent = ch.publish(EXCHANGE_NAME, routingKey, content, {
    persistent: true,
  });

  if (sent) {
    logger.info(`[Publish] Sent: ${routingKey}`);
  } else {
    logger.warn(`[Publish] Buffered (broker down): ${routingKey}`);
  }
}

/** Consume events (temporary queue + survives reconnect) */
export async function consumeEvent(
  routingKey: string,
  callback: (event: any, msg?: ConsumeMessage | null) => Promise<void> | void,
): Promise<void> {
  const setupConsumer = async () => {
    const conn = await getConnection();
    const consumerChannel = await conn.createChannel();
    await consumerChannel.assertExchange(EXCHANGE_NAME, "topic", {
      durable: true,
    });

    const { queue } = await consumerChannel.assertQueue("", {
      exclusive: true,
      autoDelete: true,
    });

    await consumerChannel.bindQueue(queue, EXCHANGE_NAME, routingKey);
    await consumerChannel.prefetch(10);

    await consumerChannel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content, msg);
          consumerChannel.ack(msg);
        } catch (err) {
          logger.error(`[Consume] Error on ${routingKey}`, err);
          consumerChannel.nack(msg, false, true);
        }
      },
      { noAck: false },
    );

    logger.info(`[Consume] Subscribed to ${routingKey} (queue: ${queue})`);

    // Re-setup if this channel dies
    consumerChannel.on("close", () => {
      logger.warn(
        `[Consume] Channel closed for ${routingKey} — re-subscribing`,
      );
      setTimeout(setupConsumer, 1000);
    });
  };

  await setupConsumer();
}

/** Warm up at startup */
export async function initRabbitMQ() {
  await getPublisherChannel().catch((err) =>
    logger.error("[RabbitMQ] Init failed (will retry)", err),
  );
}
