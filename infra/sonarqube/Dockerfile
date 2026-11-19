# SonarQube Community Build 26.5 with mc1arke/sonarqube-community-branch-plugin 26.5.0.
# The plugin README requires the jar, a javaagent for web and compute engine, and the matching webapp.
FROM sonarqube:26.5.0.122743-community

USER root

ARG PLUGIN_VERSION=26.5.0
ADD https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/download/${PLUGIN_VERSION}/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar \
    /opt/sonarqube/extensions/plugins/sonarqube-community-branch-plugin-${PLUGIN_VERSION}.jar
ADD https://github.com/mc1arke/sonarqube-community-branch-plugin/releases/download/${PLUGIN_VERSION}/sonarqube-webapp.zip \
    /tmp/sonarqube-webapp.zip

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && unzip -o /tmp/sonarqube-webapp.zip -d /opt/sonarqube/web \
    && rm -rf /var/lib/apt/lists/* /tmp/sonarqube-webapp.zip \
    && chown -R sonarqube:root /opt/sonarqube/extensions /opt/sonarqube/web \
    && chmod -R a+rX /opt/sonarqube/extensions /opt/sonarqube/web

USER sonarqube

ENV SONAR_WEB_JAVAADDITIONALOPTS="-javaagent:/opt/sonarqube/extensions/plugins/sonarqube-community-branch-plugin-26.5.0.jar=web" \
    SONAR_CE_JAVAADDITIONALOPTS="-javaagent:/opt/sonarqube/extensions/plugins/sonarqube-community-branch-plugin-26.5.0.jar=ce"
