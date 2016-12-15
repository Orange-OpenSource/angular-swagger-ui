#!/bin/bash 
# mvn clean deploy -DskipTests -DaltDeploymentRepository=nexus.wdf.sap.corp::default::http://nexus.wdf.sap.corp:8081/nexus/content/repositories/deploy.snapshots/
# mvn clean deploy -DskipTests -DaltDeploymentRepository=monsoon::default::http://mo-a1f3458fc.mo.sap.corp:8081/repository/maven-snapshots/
mvn deploy:deploy-file -Durl=http://nexus.wdf.sap.corp:8081/nexus/content/repositories/deploy.snapshots/ \
                       -DrepositoryId=nexus.wdf.sap.corp \
                       -Dfile=angular-swagger-ui-0.3.6-SNAPSHOT.jar \
                       -DpomFile=angular-swagger-ui-0.3.6-SNAPSHOT.pom