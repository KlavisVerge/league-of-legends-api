require('dotenv/config');
const AWS = require('aws-sdk');
const request = require('request-promise');
AWS.config.update({region: 'us-east-1'});

exports.handler = (event, context) => {
    if(event){
        if(!event.body){
            event.body = {};
        }else if(typeof event.body === 'string'){
            event.body = JSON.parse(event.body);
        }
    }
    const required = ['region', 'summonerName'].filter((property) => !event.body[property]);
    if(required.length > 0){
        return Promise.reject({
            statusCode: 400,
            message: `Required properties missing: "${required.join('", "')}".`
        });
    }
    let promises = [];
    let options = {
        url: 'https://na.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + event.body.summonerName + '?api_key=' + process.env.API_KEY // this gives summoner level basically and accountId, id is summoner id
    };
    promises.push(request(options).promise().then((res) => {
        return res;
    }).catch(function (err) {
        return undefined;
    }));

    options = {
        url: 'https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + event.body.summonerName + '?api_key=' + process.env.API_KEY // this gives summoner level basically and accountId, id is summoner id
    };
    promises.push(request(options).promise().then((res) => {
        return res;
    }).catch(function (err) {
        return undefined;
    }));

    options = {
        url: 'https://' + event.body.region + '.api.riotgames.com/lol/summoner/v3/summoners/by-name/' + event.body.summonerName + '?api_key=' + process.env.API_KEY // this gives summoner level basically and accountId, id is summoner id
    };
    promises.push(request(options).promise().then((res) => {
        return res;
    }).catch(function (err) {
        return undefined;
    }));

    options = {
        url: 'https://ddragon.leagueoflegends.com/realms/na.json'
    };

    promises.push(request(options).promise().then((res) => {
        return res;
    }).catch(function (err) {
        return Promise.reject({
            statusCode: err.statusCode,
            message: 'Error interacting with DDragon API.'
        });
    }));

    return Promise.all(promises).then((responses) => {
        const [na, na1, rest, realms] = responses;
        let region = '';
        let results = '';
        if(event.body.region === 'na'){
            if(na !== undefined){
                region = 'na';
                results = JSON.parse(na);
            } else {
                region = 'na1';
                results = JSON.parse(na1);
            }
        } else {
            region = event.body.region;
            results = JSON.parse(rest);
        }
        
        let promises = [];
        let options = {
            url: 'https://' + region + '.api.riotgames.com/lol/match/v3/matchlists/by-account/' + results.accountId + '?api_key=' + process.env.API_KEY
        };
        promises.push(request(options).promise().then((res) => {
            return res;
        }).catch(function (err) {
            return Promise.reject({
                statusCode: err.statusCode,
                message: 'Error interacting with Riot Games API.'
            });
        }));

        options = {
            url: 'https://' + region + '.api.riotgames.com/lol/league/v3/positions/by-summoner/' + results.id + '?api_key=' + process.env.API_KEY
        };
        promises.push(request(options).promise().then((res) => {
            return res;
        }).catch(function (err) {
            return Promise.reject({
                statusCode: err.statusCode,
                message: 'Error interacting with Riot Games API.'
            });
        }));

        options = {
            url: 'http://ddragon.leagueoflegends.com/cdn/' + JSON.parse(realms).n.summoner + '/data/en_US/champion.json'
        };
        promises.push(request(options).promise().then((res) => {
            return res;
        }).catch(function (err) {
            return Promise.reject({
                statusCode: err.statusCode,
                message: 'Error interacting with Riot Games API.'
            });
        }));

        return Promise.all(promises).then((responses) => {
            let[matchList, positions, allChampions] = responses;
            let matchesProcessed = JSON.parse(matchList);
            allChampions = JSON.parse(allChampions);
            let names = Object.getOwnPropertyNames(allChampions.data);
            let championMap = new Map();
            for(var i = 0; i < names.length; i++) {
                championMap.set(Number(allChampions.data[names[i]].key), allChampions.data[names[i]].name);
            }
            for(var j = 0; j < matchesProcessed.matches.length; j++){
                matchesProcessed.matches[j].championName = championMap.get(matchesProcessed.matches[j].champion);
            }
            let returnObject = {};
            returnObject.account = results;
            returnObject.matchList = matchesProcessed;
            returnObject.positions = positions;
            return context.succeed({
                statusCode: 200,
                body: JSON.stringify(returnObject),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,XAmz-Security-Token',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        });
    });
}