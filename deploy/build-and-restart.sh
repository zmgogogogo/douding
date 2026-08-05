#!/bin/bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-17.0.19.0.10-1.0.2.1.al8.x86_64
cd /home/admin/server-java
mvn package -DskipTests -q && echo "BUILD_OK"
systemctl restart douding
sleep 30
echo "=== PORT ==="
ss -tlnp | grep 8080
echo "=== STATUS ==="
systemctl status douding --no-pager | head -6
