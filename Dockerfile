FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /data/midi
ENV PORT=80 MIDI_DIR=/data/midi
EXPOSE 80
VOLUME ["/data/midi"]
CMD ["node","server.js"]
