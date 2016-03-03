#!/bin/bash
#
# Exit on errors or unset variables
# 
set -e -o nounset


# Check that a parameter has been supplied
#
if [ $# -ne 1 ]
then
	echo
	echo "Usage: ./drop_execs.sh <queryTitle>"
	echo
	exit
fi


# Build Mongo command
#
TITLE=${1}
COMMAND="'"'db.queries.update({ title : "'${TITLE}'" },{ $set : { executions : [] }});'"'"


# Pass command to HubDB (in Docker)
#
/bin/bash -c "sudo docker exec hubdb mongo query_composer_development --eval ${COMMAND}"
