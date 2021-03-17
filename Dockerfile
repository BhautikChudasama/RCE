FROM node:12-alpine

WORKDIR /app

#### PYTHON INSTALLATION
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

### GO INSTALLATION
COPY --from=golang:1.13-alpine /usr/local/go/ /usr/local/go/
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOOS=linux 
ENV GOARCH=amd64

### JAVA INSTALLATION
RUN apk update
RUN apk fetch openjdk8
RUN apk add openjdk8
ENV JAVA_HOME=/usr/lib/jvm/java-1.8-openjdk
ENV PATH="$JAVA_HOME/bin:${PATH}"
ENV CLASSPATH="/tmp/"
RUN javac -version
RUN java -version

### PHP INSTALLATION
RUN apk add php7

### GCC INSTALLATION
RUN apk add g++


COPY package*.json ./

RUN npm install

COPY . .

RUN adduser RCE -D

USER RCE

EXPOSE 5124

CMD ["node", "server.js"]
