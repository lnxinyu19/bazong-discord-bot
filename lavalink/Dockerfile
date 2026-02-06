FROM ghcr.io/lavalink-devs/lavalink:4-alpine

COPY application.yml /opt/Lavalink/application.yml

ENV _JAVA_OPTIONS="-Xmx512M"

EXPOSE 2333

ENTRYPOINT ["java", "-jar", "Lavalink.jar"]
