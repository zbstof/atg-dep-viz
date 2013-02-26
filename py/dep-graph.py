# coding: utf-8
from lxml import etree
import re
#from lxml.builder import E
import os
import sys
import fnmatch
import igraph
parser = etree.XMLParser(remove_blank_text=True)
graph = igraph.Graph(directed=True)


def get_dependencies(tree, pref, proj_name):
    wholepref = pref + '-'
    items = tree.xpath(
        "/classpath/classpathentry[contains(@path, '" + pref + "') != true]")
    for item in items:
        path = item.get("path")
        m = re.search('(.*)' + wholepref + '(.+?)/(.*)', path)
        if m is not None:
            suf = m.group(2)
            proj_dep_name = wholepref + suf
            #print  "Project dependency:", proj_dep_name
            add_unique_vertex(proj_dep_name)
            add_unique_vertex(proj_name)
            graph.add_edge(proj_name, proj_dep_name)


def update_classpath(file_name, root_path):
    tree = etree.parse(file_name, parser)
    proj_name = extract_project_name(file_name)
    print "Processing project: %s" % proj_name

    add_unique_vertex(proj_name)

    prefs_list = ['agent', 'kf', 'tp', 'data']
    for pref in prefs_list:
        get_dependencies(tree, pref, proj_name)


def add_unique_vertex(vertex_name):
    if not graph.vs.attribute_names() or (vertex_name not in graph.vs["name"]):
        graph.add_vertex(name=vertex_name, domain=get_domain(vertex_name))


def get_domain(project):
    return project[:project.find('-')]


def extract_project_name(file_name):
    project = file_name.replace(".classpath", '.project')
    tree = etree.parse(project, parser)
    return tree.xpath("/projectDescription/name")[0].text


def get_classpaths(root_path):
    matches = []
    for root, dirnames, filenames in os.walk(root_path):

        def clear_dirs(dirname):
            if dirname in dirnames:
                dirnames.remove(dirname)

        clear = False
        for filename in fnmatch.filter(filenames, '*.classpath'):
            clear = True
            matches.append(os.path.join(root, filename))
        # optimization - we do not have nested modules
        if clear:
            dirnames[:] = []
        else:
            clear_dirs('target')
            clear_dirs('.git')
            clear_dirs('.settings')
            clear_dirs('src')
            clear_dirs('env-install')
    return matches


def main():
    if len(sys.argv) == 1:
        print "Attempting to use the value of 'DRWN_DEV_SRC' variable..."
        path = os.environ.get('DRWN_DEV_SRC')
        if path is None:
            print "Environment variable not found!"
            print "You should pass the path to your KITS-App_ATG-Dev folder as command-line argument"
            return
    else:
        path = sys.argv[1]

    for cp in get_classpaths(path):
        update_classpath(cp, path)

    #color_dict = {"kf": "blue", "agent": "green", "tp": "red"}
    #graph.vs["domain"] = [color_dict.get(domain, "yellow") for domain in graph.vs["domain"]]
    with open("C:\Users\Stanislav_Bitsko\Scripts\Python\graph2.graphml", "w+") as f:
        graph.write_graphml(f)


if __name__ == "__main__":
    main()
