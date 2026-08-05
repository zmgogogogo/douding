#!/bin/bash
set -e
echo "=== 安装 Maven 3.9.9 ==="
cd /tmp
curl -sL "https://dlcdn.apache.org/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.tar.gz" -o maven.tar.gz
sudo tar xzf maven.tar.gz -C /opt/
sudo ln -sf /opt/apache-maven-3.9.9/bin/mvn /usr/local/bin/mvn
echo "Maven 版本:"
/opt/apache-maven-3.9.9/bin/mvn -version | head -3
echo "done"
