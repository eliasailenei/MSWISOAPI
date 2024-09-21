from flask import Flask, render_template, request
from flask.views import MethodView
from flask_smorest import Api, Blueprint
from marshmallow import Schema, fields
from bs4 import BeautifulSoup
import httpx, asyncio, re, aiohttp

app = Flask(__name__)
app.config['API_TITLE'] = 'My API'
app.config['API_VERSION'] = 'v1'
app.config['OPENAPI_VERSION'] = '3.0.2'
app.config['OPENAPI_URL_PREFIX'] = '/'

api = Api(app)

userResp = Blueprint('const', 'const', url_prefix='/', description='Get users response.')

class ExampleSchema(Schema):
    error = fields.Str(dump_only=True)
    ver = fields.Str(required=True)
    rel = fields.Str(required=True)
    href = fields.Str(required=True)
    lang = fields.Str(required=True)

class WinVerLogic(MethodView):
    @userResp.response(200, ExampleSchema(many=True))
    def get(self):
        version = request.args.get('--WinVer', default='', type=int)
        release = request.args.get('--Release', default='notset', type=str)
        ESDMode = request.args.get('--ESDMode', default='False', type=str)
        Language = request.args.get('--Language', default='notset', type=str)
        esd = esdAssign(ESDMode)
        
        if version != '':
            if version == 10 or version == 11:
                if release == 'notset':
                    return [{'error': "MISSINGRELEASE"}]
                else:
                    allRel = asyncio.run(getAllReleases(version, esd))
                    modified_release = release.replace("_", " ")
                    matching_release = next((item for item in allRel if modified_release in item['rel']), None)
                    if release == "":
                        return allRel
                    elif matching_release:
                        selRel = matching_release['href']
                        return lang(Language, selRel)
                    elif release == "latest":
                        if allRel:
                            selRel = allRel[-1]['href']
                            return lang(Language, selRel)
                        else:
                            return [{'error': "NORELEASES"}]
                    else:
                        return [{'error': "NOTFOUND"}]
            else:
                return [{'error': "UNKNOWNVER"}]
        else:
            return [{'error': "MISSINGWINVER"}]



app.add_url_rule('/', view_func=WinVerLogic.as_view('args'))
api.register_blueprint(userResp)

async def getAllReleases(ver, esd):
    if esd:
        toSearch = "Operating Systems - (ESD)"
    else:
        toSearch = "Operating Systems"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://files.rg-adguard.net/category")
            doc = BeautifulSoup(resp.text, 'html.parser')
            link = doc.find('a', string=toSearch)
            if link:
                href = link.get('href')
                return await getRel(href, ver)
            else:
                return [{'error': "NOTFOUND"}]
    except Exception as e:
        return [{'error': str(e)}]

async def getRel(href, ver):
    iList = []
    try:
        async with httpx.AsyncClient() as client:
            html = await client.get(href)
            doc = BeautifulSoup(html.text, 'html.parser')
            find = doc.find_all('a')
            pattern = r"^.*\b" + str(ver) + r"\b.*$"
            regex = re.compile(pattern, re.IGNORECASE)

            for item in find:
                name = item.text.strip()
                match = regex.search(name)
                if match:
                    iList.append({'rel': name, 'href': item.get('href')})
        return iList
    except Exception as e:
        return [{'error': str(e)}]

async def getAllLanguages(url):
    list = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

            if not response.status_code == 200:
                raise Exception("Failed to fetch HTML content")

            html = response.text
            soup = BeautifulSoup(html, 'html.parser')

            for anchor_tag in soup.find_all('a'):
                entry_url = anchor_tag.get('href')
                language = anchor_tag.text.strip()

                if not entry_url or not language:
                    continue

                if not entry_url.startswith("https://"):
                    continue

                if not re.match("^[a-zA-Z]+$", language):
                    continue

                list.append({'lang' : language, 'href' : entry_url})

            if list:
                return list
            else:
                return("Error: No valid languages found")

    except Exception as e:
        return(f"Error: {e}")

def lang(Language, selRel):
    if Language != "notset":
        allLang = asyncio.run(getAllLanguages(selRel))
        if isinstance(allLang, list):  
            matching_language = next((item for item in allLang if Language in item['lang']), None)
            if Language == "":
                return allLang
            elif matching_language:
                selLang = matching_language['href']
                downURL = str(asyncio.run(retrieve_urls(selLang)))
                return asyncio.run(msLink(downURL))
            else:
                return [{'error': "NOTFOUND"}]
        else:
            return [{'error': "REFRESHPAGE"}] 
    else:
        return [{'error': "MISSINGLANGUAGE"}]

        
def esdAssign(text):
    return text.lower() == 'true'

async def retrieve_urls(url):
    urls = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

            if not response.status_code == 200:
                raise Exception("Failed to fetch HTML content")

            html = response.text
            soup = BeautifulSoup(html, 'html.parser')
            arm = "A64"
            business = "CLIENTBUSINESS"
            anchor_tags = soup.find_all('a')

            for anchor_tag in anchor_tags:
                entry_url = anchor_tag.get('href')
                data = anchor_tag.text.strip()
                if data and not data.startswith("<") and not data.startswith("@") and is_num(data):
                    if arm not in data and business not in data:
                        urls.append(entry_url)

    except Exception as e:
        print(f"An error occurred: {str(e)}")

    res = urls[0]
    return res

def is_num(s):
    pattern = r'^\d'
    return bool(re.match(pattern, s))

async def msLink(url):
    async with aiohttp.ClientSession() as session:
        payload_official = {'dl_official': 'Test'}

        async with session.post(url, data=payload_official) as response:
           client_response_url = str(response.url)
        if client_response_url != "":
            return [{'href': client_response_url}]
        else:
            return [{'error': "NOMSLINK"}]



if __name__ == '__main__':
    app.run(debug=False)
