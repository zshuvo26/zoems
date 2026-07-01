FROM openjdk:17-slim
WORKDIR /app
COPY pom.xml .
RUN apt-get update && apt-get install -y maven
COPY src ./src
RUN mvn clean package -DskipTests
CMD ["mvn", "exec:java"]
